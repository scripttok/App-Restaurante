import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  Linking,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  fecharMesa,
  enviarComandaViaWhatsApp,
  removerPedidosDaMesa,
} from "../services/mesaService";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

export default function FecharComandaModal({
  visible,
  onClose,
  mesa,
  pedidos,
  cardapio,
  onFecharComanda,
  onAtualizarMesa,
}) {
  const [valorPago, setValorPago] = useState("");
  const [valorRecebido, setValorRecebido] = useState("");
  const [divisao, setDivisao] = useState("1");
  const [telefoneCliente, setTelefoneCliente] = useState("");
  const [desconto, setDesconto] = useState(""); // Novo estado para o desconto
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      setIsSubmitting(false);
    };
  }, []);

  const calcularTotalPedido = (itens) => {
    const itensValidos = Array.isArray(itens) ? itens : [];
    return itensValidos
      .reduce((total, i) => {
        const itemCardapio = cardapio.find((c) => c.nome === i.nome);
        const precoUnitario = itemCardapio ? itemCardapio.precoUnitario : 0;
        return total + (i.quantidade * precoUnitario || 0);
      }, 0)
      .toFixed(2);
  };

  const calcularTotalSemDesconto = () => {
    if (!pedidos || pedidos.length === 0) return "0.00";
    return pedidos
      .reduce((total, pedido) => {
        return total + parseFloat(calcularTotalPedido(pedido.itens));
      }, 0)
      .toFixed(2);
  };

  const calcularTotalComDesconto = () => {
    const totalSemDesconto = parseFloat(calcularTotalSemDesconto());
    const descontoNum = parseFloat(desconto) || 0;
    return Math.max(0, totalSemDesconto - descontoNum).toFixed(2);
  };

  const calcularRestante = () => {
    const totalComDesconto = parseFloat(calcularTotalComDesconto());
    const pagoAnterior = mesa?.valorPago || 0;
    const pagoNovo = parseFloat(valorPago) || 0;
    return Math.max(0, totalComDesconto - (pagoAnterior + pagoNovo)).toFixed(2);
  };

  const calcularDivisao = () => {
    const totalComDesconto = parseFloat(calcularTotalComDesconto());
    const numDivisao = parseInt(divisao) || 1;
    return (totalComDesconto / numDivisao).toFixed(2);
  };

  const calcularTroco = () => {
    const recebido = parseFloat(valorRecebido) || 0;
    const restante = parseFloat(calcularRestante());
    return Math.max(0, recebido - restante).toFixed(2);
  };

  const isPagamentoSuficiente = () => {
    const restante = parseFloat(calcularRestante());
    const recebido = parseFloat(valorRecebido) || 0;
    return recebido >= restante;
  };

  const isPagamentoParcial = () => {
    const totalComDesconto = parseFloat(calcularTotalComDesconto());
    const pagoAnterior = mesa?.valorPago || 0;
    const pagoNovo = parseFloat(valorPago) || 0;
    const pagoTotal = pagoAnterior + pagoNovo;
    return pagoTotal > 0 && pagoTotal < totalComDesconto;
  };

  const getResumoConta = () => {
    const itensEntregues = pedidos
      .filter((p) => p.entregue)
      .flatMap((p) => p.itens || []);
    const resumo = itensEntregues.reduce((acc, item) => {
      acc[item.nome] = (acc[item.nome] || 0) + item.quantidade;
      return acc;
    }, {});
    const itens = Object.entries(resumo).map(([item, quantidade]) => {
      const itemCardapio = cardapio.find((c) => c.nome === item);
      const precoUnitario = itemCardapio ? itemCardapio.precoUnitario : 0;
      return {
        item,
        quantidade,
        precoUnitario,
        subtotal: precoUnitario * quantidade,
      };
    });
    return {
      numero: mesa?.numero || "N/A",
      nomeCliente: mesa?.nomeCliente || "N/A",
      itens,
      totalSemDesconto: calcularTotalSemDesconto(),
      desconto: parseFloat(desconto) || 0,
      total: calcularTotalComDesconto(),
      pago: (mesa?.valorPago || 0) + (parseFloat(valorPago) || 0),
      restante: calcularRestante(),
    };
  };

  const gerarConteudoCSV = () => {
    try {
      const resumo = getResumoConta();
      console.log("(NOBRIDGE) LOG Gerando CSV com resumo:", resumo);

      let csvContent = "Mesa,Item,Quantidade,Preço Unitário,Subtotal\n";
      resumo.itens.forEach((item) => {
        csvContent += `${resumo.numero},${item.item},${
          item.quantidade
        },${item.precoUnitario.toFixed(2)},${item.subtotal.toFixed(2)}\n`;
      });

      // Garantir que os valores sejam números antes de formatar
      const totalSemDesconto = parseFloat(resumo.totalSemDesconto) || 0;
      const desconto = parseFloat(resumo.desconto) || 0;
      const total = parseFloat(resumo.total) || 0;
      const pago = parseFloat(resumo.pago) || 0;
      const restante = parseFloat(resumo.restante) || 0;

      csvContent += `,,Total Sem Desconto,,${totalSemDesconto.toFixed(2)}\n`;
      csvContent += `,,Desconto,,${desconto.toFixed(2)}\n`;
      csvContent += `,,Total Geral,,${total.toFixed(2)}\n`;
      csvContent += `,,Pago,,${pago.toFixed(2)}\n`;
      csvContent += `,,Restante,,${restante.toFixed(2)}\n`;

      console.log("(NOBRIDGE) LOG Conteúdo CSV gerado:", csvContent);
      return csvContent;
    } catch (error) {
      console.error("(NOBRIDGE) ERROR Erro ao gerar conteúdo CSV:", error);
      throw error;
    }
  };

  const exportarCSV = async () => {
    try {
      const csvContent = gerarConteudoCSV();
      const fileName = `comanda_mesa_${mesa?.numero || "desconhecida"}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`; // Direto no cacheDirectory

      // Escrever o arquivo
      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      console.log("(NOBRIDGE) LOG Arquivo CSV salvo em:", filePath);

      // Verificar se o compartilhamento tá disponível
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Erro", "Compartilhamento não disponível no dispositivo.");
        return;
      }

      // Compartilhar o arquivo
      await Sharing.shareAsync(filePath, {
        mimeType: "text/csv",
        dialogTitle: "Compartilhar Comanda CSV",
      });

      console.log("(NOBRIDGE) LOG CSV compartilhado com sucesso");
      Alert.alert(
        "Sucesso",
        `Comanda exportada como ${fileName} e pronta para compartilhar!`
      );
    } catch (error) {
      console.error(
        "(NOBRIDGE) ERROR Erro ao exportar ou compartilhar CSV:",
        error
      );
      Alert.alert("Erro", `Falha ao exportar CSV: ${error.message}`);
      throw error;
    }
  };

  const handleFecharComanda = async () => {
    if (!mesa || isSubmitting) return;
    const totalSemDesconto = parseFloat(calcularTotalSemDesconto());
    const descontoNum = parseFloat(desconto) || 0;
    if (descontoNum > totalSemDesconto) {
      Alert.alert(
        "Erro",
        "O desconto não pode ser maior que o total sem desconto."
      );
      return;
    }
    if (!isPagamentoSuficiente()) {
      Alert.alert(
        "Erro",
        "O valor recebido deve ser maior ou igual ao restante a pagar para fechar a comanda."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const totalComDesconto = parseFloat(calcularTotalComDesconto());
      const pagoAnterior = mesa?.valorPago || 0;
      const pagoNovo = parseFloat(valorPago) || 0;
      const recebido = parseFloat(valorRecebido) || 0;
      const troco = calcularTroco();
      const pagoTotal = pagoAnterior + pagoNovo;

      console.log("Fechando comanda:", {
        mesaId: mesa.id,
        totalSemDesconto,
        desconto: descontoNum,
        totalComDesconto,
        pagoAnterior,
        pagoNovo,
        pagoTotal,
        recebido,
        troco,
      });

      // Preparar os dados do pedido para salvar
      const pedidoData = {
        numero: mesa.numero,
        nomeCliente: mesa.nomeCliente,
        totalSemDesconto: totalSemDesconto,
        desconto: descontoNum,
        total: totalComDesconto,
        pago: pagoTotal,
        recebido: recebido,
        troco: troco,
        dataFechamento: new Date().toISOString(), // Adiciona a data de fechamento
        itens: pedidos.flatMap((p) => p.itens || []), // Inclui os itens do pedido
      };

      // Salvar os dados no armazenamento local
      const fileName = `pedido_mesa_${mesa.numero}_${Date.now()}.json`; // Nome único com timestamp
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(
        filePath,
        JSON.stringify(pedidoData),
        {
          encoding: FileSystem.EncodingType.UTF8,
        }
      );
      console.log("(NOBRIDGE) LOG Pedido salvo localmente em:", filePath);

      // Atualizar a mesa no Firebase e remover pedidos
      const updates = {
        valorPago: pagoTotal,
        valorRestante: 0,
        valorRecebido: recebido,
        troco,
        desconto: descontoNum,
        status: "fechada",
      };
      await removerPedidosDaMesa(mesa.numero);
      await fecharMesa(mesa.id, updates);

      // Atualizar a mesa no componente pai e fechar o modal
      onAtualizarMesa({ ...mesa, ...updates });
      onFecharComanda();

      Alert.alert("Sucesso", "Comanda fechada e salva no histórico!");
    } catch (error) {
      Alert.alert(
        "Erro",
        `Não foi possível fechar a comanda: ${error.message}`
      );
      console.error("(NOBRIDGE) ERROR Erro ao fechar comanda:", error);
    } finally {
      setIsSubmitting(false);
      setValorPago("");
      setValorRecebido("");
      setDesconto("");
    }
  };

  const handleRecebidoParcial = async () => {
    if (!mesa || isSubmitting) return;
    const pagoNovo = parseFloat(valorPago) || 0;
    const descontoNum = parseFloat(desconto) || 0;
    const totalSemDesconto = parseFloat(calcularTotalSemDesconto());
    if (descontoNum > totalSemDesconto) {
      Alert.alert(
        "Erro",
        "O desconto não pode ser maior que o total sem desconto."
      );
      return;
    }
    if (pagoNovo <= 0) {
      Alert.alert(
        "Erro",
        "O valor pago deve ser maior que 0 para registrar um pagamento parcial."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const totalComDesconto = parseFloat(calcularTotalComDesconto());
      const pagoAnterior = mesa?.valorPago || 0;
      const recebido = parseFloat(valorRecebido) || 0;
      const pagoTotal = pagoAnterior + pagoNovo;
      const restante = Math.max(0, totalComDesconto - pagoTotal).toFixed(2);
      const troco =
        recebido > pagoNovo ? (recebido - pagoNovo).toFixed(2) : "0.00";

      const updates = {
        valorPago: pagoTotal,
        valorRestante: restante,
        valorRecebido: recebido,
        troco,
        desconto: descontoNum, // Inclui o desconto nos dados salvos
        status: "aberta",
      };

      console.log(
        "Antes de chamar fecharMesa para pagamento parcial:",
        updates
      );
      await fecharMesa(mesa.id, updates);
      console.log(
        "Após fecharMesa, atualização enviada para mesaAtual:",
        updates
      );

      Alert.alert(
        "Sucesso",
        `Pagamento parcial de R$ ${pagoNovo.toFixed(
          2
        )} registrado! Restante: R$ ${restante}`
      );
      onAtualizarMesa({
        ...mesa,
        ...updates,
      });
      console.log(
        "Pagamento parcial registrado, status mantido como 'aberta', mesaAtual atualizada"
      );
      setValorPago("");
      setValorRecebido("");
      setDesconto(""); // Limpa o campo de desconto
    } catch (error) {
      Alert.alert(
        "Erro",
        `Não foi possível registrar o pagamento parcial: ${error.message}`
      );
      console.error("Erro ao registrar pagamento parcial:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnviarWhatsApp = async () => {
    if (!mesa || pedidos.length === 0 || isSubmitting) {
      Alert.alert("Erro", "Nenhum pedido para enviar.");
      return;
    }
    const totalSemDesconto = parseFloat(calcularTotalSemDesconto());
    const descontoNum = parseFloat(desconto) || 0;
    if (descontoNum > totalSemDesconto) {
      Alert.alert(
        "Erro",
        "O desconto não pode ser maior que o total sem desconto."
      );
      return;
    }
    if (!isPagamentoSuficiente()) {
      Alert.alert(
        "Erro",
        "O valor recebido deve ser maior ou igual ao restante para enviar via WhatsApp."
      );
      return;
    }

    let numeroLimpo = telefoneCliente.replace(/[^\d+]/g, "");
    if (!numeroLimpo) {
      Alert.alert("Erro", "Por favor, insira um número de telefone.");
      return;
    }
    if (!numeroLimpo.startsWith("+")) {
      numeroLimpo = `+55${numeroLimpo}`;
    }
    if (
      numeroLimpo.length < 12 ||
      (numeroLimpo.startsWith("+55") && numeroLimpo.length < 13)
    ) {
      Alert.alert(
        "Erro",
        "Número inválido. Use o formato DDD + número (ex.: 11987654321) ou internacional (ex.: +12025550123)."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const whatsappUrl = enviarComandaViaWhatsApp(
        mesa.numero,
        pedidos,
        cardapio,
        numeroLimpo
      );

      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) {
        await Linking.openURL(whatsappUrl);

        const totalComDesconto = parseFloat(calcularTotalComDesconto());
        const pagoAnterior = parseFloat(mesa?.valorPago || 0);
        const pagoNovo = parseFloat(valorPago) || totalComDesconto;
        const recebido = parseFloat(valorRecebido) || 0;
        const troco = calcularTroco();
        const pagoTotal = pagoAnterior + pagoNovo;

        const updates = {
          valorPago: pagoTotal,
          valorRestante: 0,
          valorRecebido: recebido,
          troco,
          desconto: descontoNum, // Inclui o desconto nos dados salvos
          status: "fechada",
        };

        await removerPedidosDaMesa(mesa.numero);
        await fecharMesa(mesa.id, updates);
        onAtualizarMesa({
          ...mesa,
          ...updates,
        });

        Alert.alert("Sucesso", "Comanda enviada via WhatsApp e fechada!");
        onFecharComanda();
      } else {
        Alert.alert(
          "Erro",
          "WhatsApp não está instalado ou não suporta envio de mensagens."
        );
      }
    } catch (error) {
      Alert.alert(
        "Erro",
        `Não foi possível enviar via WhatsApp ou fechar a comanda: ${error.message}`
      );
      console.error("Erro ao enviar via WhatsApp:", error);
    } finally {
      setIsSubmitting(false);
      setDesconto(""); // Limpa o campo de desconto
    }
  };

  const CustomButton = ({ title, onPress, color, disabled }) => (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: disabled ? "#999" : color || "#5C4329" },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.titulo}>
              Fechar Comanda - Mesa {mesa?.numero}
            </Text>
            <Text style={styles.totalGeral}>
              Total R$ {calcularTotalSemDesconto()}
            </Text>
            <Text style={styles.label}>Desconto:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o desconto (ex.: 10.00)"
              keyboardType="numeric"
              value={desconto}
              onChangeText={(text) => setDesconto(text.replace(/[^0-9.]/g, ""))}
              placeholderTextColor="#888"
            />
            <Text style={styles.totalGeral}>
              Total com desconto: R$ {calcularTotalComDesconto()}
            </Text>
            <Text style={styles.label}>Dividir em quantas partes?</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex.: 1"
              keyboardType="numeric"
              value={divisao}
              onChangeText={(text) => setDivisao(text.replace(/[^0-9]/g, ""))}
              placeholderTextColor="#888"
            />
            <Text style={styles.divisao}>
              Valor por parte: R$ {calcularDivisao()}
            </Text>
            <Text style={styles.label}>Pagar parcial:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o valor pago (ex.: 15.00)"
              keyboardType="numeric"
              value={valorPago}
              onChangeText={(text) =>
                setValorPago(text.replace(/[^0-9.]/g, ""))
              }
              placeholderTextColor="#888"
            />
            <Text style={styles.label}>Valor Recebido:</Text>
            <TextInput
              style={styles.input}
              placeholder="Digite o valor recebido (ex.: 50.00)"
              keyboardType="numeric"
              value={valorRecebido}
              onChangeText={(text) =>
                setValorRecebido(text.replace(/[^0-9.]/g, ""))
              }
              placeholderTextColor="#888"
            />

            {!isPagamentoSuficiente() && isPagamentoParcial() && (
              <Text style={styles.saldoDevedor}>
                Saldo Devedor: R$ {calcularRestante()}
              </Text>
            )}
            <Text
              style={[
                styles.troco,
                isPagamentoSuficiente() && styles.trocoDestaque,
              ]}
            >
              Troco: R$ {calcularTroco()}
            </Text>
            <Text style={styles.label}>Número do Cliente:</Text>
            <TextInput
              style={styles.input}
              placeholder="Número do Cliente (ex.: 11987654321)"
              keyboardType="phone-pad"
              value={telefoneCliente}
              onChangeText={setTelefoneCliente}
              placeholderTextColor="#888"
            />
            <View style={styles.botoes}>
              <CustomButton
                title="Exportar CSV"
                onPress={async () => {
                  await exportarCSV();
                }}
                color="#1E90FF" // Azul pra destacar
                disabled={isSubmitting || pedidos.length === 0}
              />
              <CustomButton
                title="Enviar via WhatsApp"
                onPress={handleEnviarWhatsApp}
                color="#25D366"
                disabled={!isPagamentoSuficiente() || isSubmitting}
              />
              <CustomButton
                title="Fechar Comanda"
                onPress={handleFecharComanda}
                color="#ff4444"
                disabled={!isPagamentoSuficiente() || isSubmitting}
              />
              {isPagamentoParcial() && (
                <CustomButton
                  title="Recebido Parcial"
                  onPress={handleRecebidoParcial}
                  color="#FFA500"
                  disabled={isSubmitting}
                />
              )}
              <CustomButton title="Voltar" onPress={onClose} color="#666" />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 15,
    backgroundColor: "#5C4329",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titulo: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFA500",
    textAlign: "center",
    marginBottom: 20,
  },
  totalGeral: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginVertical: 15,
  },
  label: {
    fontSize: 16,
    color: "#999",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
    fontSize: 16,
    color: "#FFFFFF",
    backgroundColor: "#FFFFFF00",
    textAlign: "left",
  },
  divisao: {
    fontSize: 16,
    color: "#FFA500",
    textAlign: "center",
    marginVertical: 10,
  },
  restante: {
    fontSize: 16,
    color: "#FFA500",
    textAlign: "center",
    marginVertical: 10,
  },
  saldoDevedor: {
    fontSize: 16,
    color: "#FF4444",
    textAlign: "center",
    marginVertical: 10,
    fontWeight: "600",
  },
  troco: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginVertical: 15,
  },
  trocoDestaque: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#28A745",
  },
  botoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
    gap: 15,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#5C4329",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  buttonText: {
    color: "#F9D423",
    fontSize: 16,
    fontWeight: "600",
  },
});
