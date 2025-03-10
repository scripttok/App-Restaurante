import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  StyleSheet,
  Button,
  Alert,
  TouchableOpacity,
} from "react-native";
import AdicionarItensModal from "./AdicionarItensModal";
import FecharComandaModal from "./FecharComandaModal";
import { atualizarStatusPedido, getCardapio } from "../services/mesaService";
import { ensureFirebaseInitialized } from "../services/firebase";

export default function DetalhesMesaModal({
  visible,
  onClose,
  mesa,
  pedidos,
  onAdicionarPedido,
}) {
  const [adicionarItensVisible, setAdicionarItensVisible] = useState(false);
  const [fecharComandaVisible, setFecharComandaVisible] = useState(false);
  const [cardapio, setCardapio] = useState([]);
  const [mesaAtual, setMesaAtual] = useState(mesa || {});
  const [pedidosLocais, setPedidosLocais] = useState(pedidos || []);

  // Função para buscar os dados mais recentes da mesa do Firebase
  const fetchMesaAtual = async () => {
    if (!mesa?.id) return;
    try {
      const freshDb = await ensureFirebaseInitialized();
      const ref = freshDb.ref(`mesas/${mesa.id}`);
      const snapshot = await ref.once("value");
      const mesaData = snapshot.val();
      if (mesaData) {
        console.log("(NOBRIDGE) LOG Mesa atualizada do Firebase:", mesaData);
        setMesaAtual({ id: mesa.id, ...mesaData });
      }
    } catch (error) {
      console.error("(NOBRIDGE) ERROR Erro ao buscar mesa do Firebase:", error);
    }
  };

  useEffect(() => {
    console.log("(NOBRIDGE) LOG Mesa recebida como prop:", mesa);
    setMesaAtual(mesa || {});
    setPedidosLocais(pedidos || []);

    let unsubscribe;
    if (visible) {
      fetchMesaAtual(); // Busca os dados mais recentes ao abrir o modal
      unsubscribe = getCardapio((data) => {
        console.log(
          "(NOBRIDGE) LOG Cardápio recebido no DetalhesMesaModal:",
          data
        );
        setCardapio(data);
      });
    }
    return () => {
      if (unsubscribe) {
        console.log(
          "(NOBRIDGE) LOG Desmontando listener de cardápio no DetalhesMesaModal"
        );
        unsubscribe();
      }
    };
  }, [visible, mesa, pedidos]);

  const handleStatusToggle = async (pedidoId, entregueAtual) => {
    try {
      await atualizarStatusPedido(pedidoId, !entregueAtual);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar o status do pedido.");
    }
  };

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

  const calcularTotalGeral = () => {
    const pedidosValidos = Array.isArray(pedidosLocais) ? pedidosLocais : [];
    if (!pedidosValidos.length) return "0.00";
    const total = pedidosValidos.reduce((acc, pedido) => {
      const pedidoTotal = calcularTotalPedido(pedido.itens);
      return acc + parseFloat(pedidoTotal);
    }, 0);
    console.log("Calculando total geral:", { pedidos: pedidosValidos, total });
    return total.toFixed(2);
  };

  const handleAtualizarMesa = (novaMesa) => {
    console.log(
      "(NOBRIDGE) LOG Atualizando mesaAtual com novos dados:",
      novaMesa
    );
    setMesaAtual(novaMesa);
    fetchMesaAtual(); // Busca os dados mais recentes após atualização
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemDetails}>
        <Text style={styles.itemText}>
          {(item.itens || [])
            .map(
              (i) =>
                `${i.nome} x${i.quantidade}${
                  i.observacao ? ` (${i.observacao})` : ""
                }`
            )
            .join(", ")}
        </Text>
        <Text style={styles.itemTotal}>
          Total: R$ {calcularTotalPedido(item.itens)}
        </Text>
      </View>
      <CustomButton
        title={item.entregue ? "Entregue" : "Entregar"}
        onPress={() => !item.entregue && handleStatusToggle(item.id)}
        color={item.entregue ? "#ff4444" : "#4CAF50"}
        disabled={item.entregue}
      />
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>
            Mesa {mesaAtual?.numero || "N/A"} -{" "}
            {mesaAtual?.nomeCliente || "Sem cliente"}
          </Text>
          <FlatList
            data={pedidosLocais}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
            ListEmptyComponent={
              <Text style={styles.itemText}>Sem pedidos</Text>
            }
          />
          <Text style={styles.totalGeral}>
            Total Geral: R$ {calcularTotalGeral()}
          </Text>
          <Text style={styles.valorPago}>
            Valor Pago: R$ {(mesaAtual?.valorPago || 0).toFixed(2)}
          </Text>
          {(() => {
            const valorRestante = parseFloat(mesaAtual?.valorRestante || 0);
            return valorRestante > 0 ? (
              <Text style={styles.saldoDevedor}>
                Saldo Devedor: R$ {valorRestante.toFixed(2)}
              </Text>
            ) : null;
          })()}
          <View style={styles.botoes}>
            <CustomButton
              title="Adicionar Itens"
              onPress={() => setAdicionarItensVisible(true)}
              color="#2196F3"
            />
            <CustomButton
              title="Pagar"
              onPress={() => setFecharComandaVisible(true)}
              color="#FFA500"
            />
            <CustomButton title="Voltar" onPress={onClose} color="#666" />
          </View>
        </View>
      </View>
      <AdicionarItensModal
        visible={adicionarItensVisible}
        onClose={() => setAdicionarItensVisible(false)}
        onConfirm={(itens) => {
          onAdicionarPedido(mesaAtual.numero, itens);
          setAdicionarItensVisible(false);
        }}
        mesa={mesaAtual}
      />
      <FecharComandaModal
        visible={fecharComandaVisible}
        onClose={() => setFecharComandaVisible(false)}
        mesa={mesaAtual}
        pedidos={pedidosLocais}
        cardapio={cardapio}
        onFecharComanda={() => {
          setFecharComandaVisible(false);
          onClose();
        }}
        onAtualizarMesa={handleAtualizarMesa}
      />
    </Modal>
  );
}

const CustomButton = ({ title, onPress, color, disabled }) => (
  <TouchableOpacity
    style={[
      styles.button,
      { backgroundColor: color || "#2196F3" },
      disabled && { opacity: 0.5 },
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

// backgroundColor: "#5C4329"

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Escurecido para mais contraste
  },
  modalContent: {
    width: "90%", // Maior largura para respirar
    maxWidth: 400,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12, // Bordas mais suaves
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5, // Sombra no Android
  },
  titulo: {
    fontSize: 24, // Aumentada para destaque
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 15,
  },
  flatList: {
    flexGrow: 0,
    maxHeight: 350, // Aumentado para mais visibilidade
    marginVertical: 10,
  },
  flatListContent: {
    paddingBottom: 15,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginVertical: 5,
    backgroundColor: "#f9f9f9", // Fundo claro para destaque
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemDetails: {
    flex: 1,
    marginRight: 10,
  },
  itemText: {
    fontSize: 16,
    color: "#444",
    fontWeight: "500",
  },
  itemTotal: {
    fontSize: 14,
    color: "#777",
    marginTop: 5,
  },
  totalGeral: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#2196F3", // Azul para destaque
    marginVertical: 10,
  },
  valorPago: {
    fontSize: 16,
    textAlign: "center",
    color: "#4CAF50", // Verde para valor pago
    marginVertical: 5,
  },
  saldoDevedor: {
    fontSize: 16,
    textAlign: "center",
    color: "#ff4444", // Vermelho para saldo devedor
    marginVertical: 5,
  },
  botoes: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 20,
    gap: 15, // Mais espaçamento entre botões
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#2196F3", // Cor padrão para botões
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
