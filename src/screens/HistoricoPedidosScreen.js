import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as FileSystem from "expo-file-system";

export default function HistoricoPedidosScreen() {
  const navigation = useNavigation();
  const [pedidosSalvos, setPedidosSalvos] = useState([]);

  useEffect(() => {
    listarPedidosSalvos();
  }, []);

  const listarPedidosSalvos = async () => {
    try {
      const arquivos = await FileSystem.readDirectoryAsync(
        FileSystem.documentDirectory
      );
      const pedidosArquivos = arquivos.filter(
        (file) => file.startsWith("pedido_mesa_") && file.endsWith(".json")
      );

      const pedidos = await Promise.all(
        pedidosArquivos.map(async (file) => {
          const conteudo = await FileSystem.readAsStringAsync(
            `${FileSystem.documentDirectory}${file}`
          );
          const pedido = JSON.parse(conteudo);
          return { fileName: file, ...pedido };
        })
      );

      setPedidosSalvos(pedidos);
    } catch (error) {
      console.error("(NOBRIDGE) ERROR Erro ao listar pedidos salvos:", error);
      setPedidosSalvos([]);
    }
  };

  const removerPedido = async (fileName) => {
    Alert.alert(
      "Confirmar Remoção",
      "Tem certeza que deseja remover este pedido do histórico?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              const filePath = `${FileSystem.documentDirectory}${fileName}`;
              await FileSystem.deleteAsync(filePath);
              console.log("(NOBRIDGE) LOG Pedido removido:", filePath);
              // Atualizar a lista após remoção
              setPedidosSalvos((prev) =>
                prev.filter((p) => p.fileName !== fileName)
              );
              Alert.alert("Sucesso", "Pedido removido do histórico!");
            } catch (error) {
              console.error("(NOBRIDGE) ERROR Erro ao remover pedido:", error);
              Alert.alert(
                "Erro",
                `Não foi possível remover o pedido: ${error.message}`
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Histórico de Pedidos</Text>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {pedidosSalvos.length === 0 ? (
          <Text style={styles.semPedidos}>Nenhum pedido salvo encontrado.</Text>
        ) : (
          pedidosSalvos.map((pedido, index) => (
            <View key={index} style={styles.pedidoCard}>
              <Text style={styles.pedidoTitle}>Mesa {pedido.numero}</Text>
              <Text style={styles.pedidoText}>
                Cliente: {pedido.nomeCliente}
              </Text>
              <Text style={styles.pedidoText}>
                Total Sem Desconto: R$ {pedido.totalSemDesconto}
              </Text>
              <Text style={styles.pedidoText}>
                Desconto: R$ {pedido.desconto}
              </Text>
              <Text style={styles.pedidoText}>Total: R$ {pedido.total}</Text>
              <Text style={styles.pedidoText}>Pago: R$ {pedido.pago}</Text>
              <Text style={styles.pedidoText}>
                Recebido: R$ {pedido.recebido}
              </Text>
              <Text style={styles.pedidoText}>Troco: R$ {pedido.troco}</Text>
              <Text style={styles.pedidoText}>
                Data de Fechamento:{" "}
                {new Date(pedido.dataFechamento).toLocaleString()}
              </Text>
              <Text style={styles.pedidoText}>Arquivo: {pedido.fileName}</Text>
              <TouchableOpacity
                style={styles.removerButton}
                onPress={() => removerPedido(pedido.fileName)}
              >
                <Text style={styles.removerButtonText}>Remover</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
      <TouchableOpacity
        style={styles.voltarButton}
        onPress={() => navigation.navigate("Home")}
      >
        <Text style={styles.voltarButtonText}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#5C4329",
  },
  titulo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFA500",
    textAlign: "center",
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  pedidoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  pedidoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5C4329",
    marginBottom: 5,
  },
  pedidoText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 5,
  },
  semPedidos: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
  },
  voltarButton: {
    backgroundColor: "#FF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  voltarButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  removerButton: {
    backgroundColor: "#FF4444",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    alignSelf: "flex-end",
    marginTop: 10,
  },
  removerButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
