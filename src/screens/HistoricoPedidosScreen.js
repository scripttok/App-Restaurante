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
import {
  getHistoricoPedidos,
  ensureFirebaseInitialized,
} from "../services/mesaService";

export default function HistoricoPedidosScreen() {
  const navigation = useNavigation();
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = getHistoricoPedidos((data) => {
      setHistorico(data);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const removerPedido = async (pedidoId) => {
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
              const freshDb = await ensureFirebaseInitialized();
              await freshDb.ref(`historicoPedidos/${pedidoId}`).remove();

              // Atualiza o estado local imediatamente
              setHistorico((prev) => prev.filter((p) => p.id !== pedidoId));

              Alert.alert("Sucesso", "Pedido removido do histórico!");
            } catch (error) {
              console.error("Erro ao remover pedido:", error);
              Alert.alert(
                "Erro",
                "Não foi possível remover o pedido. Tente novamente."
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

      {loading ? (
        <Text style={styles.loading}>Carregando histórico...</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {historico.length === 0 ? (
            <Text style={styles.semPedidos}>Nenhum pedido no histórico.</Text>
          ) : (
            historico.map((pedido) => (
              <View key={pedido.id} style={styles.pedidoCard}>
                <Text style={styles.pedidoTitle}>Mesa {pedido.numero}</Text>
                <Text style={styles.pedidoText}>
                  Cliente: {pedido.nomeCliente}
                </Text>

                {/* Lista de itens */}
                {pedido.itens?.map((item, i) => (
                  <Text key={`${pedido.id}-${i}`} style={styles.pedidoItem}>
                    {item.item} x{item.quantidade} - R${" "}
                    {item.subtotal.toFixed(2)}
                  </Text>
                ))}

                <Text style={styles.pedidoTotal}>
                  Total Sem Desconto: R$ {pedido.totalSemDesconto.toFixed(2)}
                </Text>

                {pedido.desconto > 0 && (
                  <Text style={styles.pedidoTotal}>
                    Desconto: R$ {pedido.desconto.toFixed(2)}
                  </Text>
                )}

                <Text style={styles.pedidoTotal}>
                  Total: R$ {pedido.total.toFixed(2)}
                </Text>

                <Text style={styles.pedidoTotal}>
                  Pago: R$ {pedido.pago.toFixed(2)}
                </Text>

                {pedido.recebido > 0 && (
                  <Text style={styles.pedidoTotal}>
                    Recebido: R$ {pedido.recebido.toFixed(2)}
                  </Text>
                )}

                {pedido.troco > 0 && (
                  <Text style={styles.pedidoTotal}>
                    Troco: R$ {pedido.troco.toFixed(2)}
                  </Text>
                )}

                <Text style={styles.pedidoData}>
                  {new Date(pedido.dataFechamento).toLocaleString("pt-BR")}
                </Text>

                <TouchableOpacity
                  style={styles.removerButton}
                  onPress={() => removerPedido(pedido.id)}
                >
                  <Text style={styles.removerButtonText}>Remover</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

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
  loading: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 20,
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
    borderLeftWidth: 4,
    borderLeftColor: "#FFA500",
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
  pedidoItem: {
    fontSize: 14,
    color: "#555",
    marginLeft: 10,
    marginBottom: 3,
  },
  pedidoTotal: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginTop: 5,
  },
  pedidoData: {
    fontSize: 13,
    color: "#777",
    marginTop: 5,
    fontStyle: "italic",
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
