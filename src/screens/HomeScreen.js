import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  Alert,
  TouchableOpacity,
  DrawerLayoutAndroid,
  ScrollView,
  TextInput,
  Modal,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import Mesa from "../components/Mesa";
import AdicionarMesaModal from "../components/AdicionarMesaModal";
import DetalhesMesaModal from "../components/DetalhesMesaModal";
import ControleEstoqueModal from "../components/ControleEstoqueModal";
import GerenciarEstoqueCardapioModal from "../components/GerenciarEstoqueCardapioModal";
import GerenciarFichasTecnicasModal from "../components/GerenciarFichasTecnicasModal";
import * as Notifications from "expo-notifications";
import { useNavigation } from "@react-navigation/native";
import {
  adicionarMesaNoFirebase,
  getMesas,
  getPedidos,
  atualizarMesa,
  juntarMesas,
  adicionarPedido,
  getEstoque,
  removerMesa,
  removerPedidosDaMesa,
} from "../services/mesaService";
import { ensureFirebaseInitialized } from "../services/firebase";

export default function HomeScreen() {
  const [searchText, setSearchText] = useState("");
  const [mesas, setMesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [estoque, setEstoque] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [detalhesVisible, setDetalhesVisible] = useState(false);
  const [estoqueVisible, setEstoqueVisible] = useState(false);
  const [gerenciarVisible, setGerenciarVisible] = useState(false);
  const [fichasTecnicasVisible, setFichasTecnicasVisible] = useState(false);
  const [mesaSelecionada, setMesaSelecionada] = useState(null);
  const [mesaDetalhes, setMesaDetalhes] = useState(null);
  const [drawer, setDrawer] = useState(null);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [actionToPerform, setActionToPerform] = useState(null); // Armazena a ação a ser executada após a senha

  const navigation = useNavigation();

  useEffect(() => {
    let unsubscribeMesas, unsubscribePedidos, unsubscribeEstoque;
    let previousPedidosCount = 0;
    let soundObject = null;

    const initializeFirebaseAndListeners = async () => {
      try {
        await ensureFirebaseInitialized();
        console.log(
          "(NOBRIDGE) LOG Firebase inicializado com sucesso no HomeScreen"
        );

        unsubscribeMesas = getMesas((data) => {
          console.log("(NOBRIDGE) LOG Mesas recebidas no HomeScreen:", data);
          setMesas(data);
        });

        unsubscribePedidos = getPedidos(async (data) => {
          console.log("(NOBRIDGE) LOG Pedidos recebidos no HomeScreen:", data);
          const currentPedidosCount = data.length;

          if (
            currentPedidosCount > previousPedidosCount &&
            previousPedidosCount !== 0
          ) {
            try {
              const { sound } = await Audio.Sound.createAsync(
                require("../../assets/notification.mp3")
              );
              soundObject = sound;
              await sound.playAsync();
              console.log(
                "(NOBRIDGE) LOG Som de notificação tocado com sucesso"
              );
            } catch (error) {
              console.error(
                "(NOBRIDGE) ERROR Erro ao tocar som de notificação:",
                error
              );
            }
          }
          previousPedidosCount = currentPedidosCount;
          setPedidos(data);
        });

        unsubscribeEstoque = getEstoque((data) => {
          console.log("(NOBRIDGE) LOG Estoque recebido no HomeScreen:", data);
          setEstoque(data);
          const estoqueBaixo = data.filter(
            (item) => item.quantidade <= item.estoqueMinimo
          );
          if (estoqueBaixo.length > 0) {
            Alert.alert(
              "Atenção: Estoque Baixo",
              estoqueBaixo
                .map(
                  (item) => `${item.nome} (${item.quantidade} ${item.unidade})`
                )
                .join("\n")
            );
          }
        });
      } catch (error) {
        console.error(
          "(NOBRIDGE) ERROR Erro ao inicializar Firebase ou configurar listeners:",
          error
        );
      }
    };

    initializeFirebaseAndListeners();

    return () => {
      if (unsubscribeMesas) unsubscribeMesas();
      if (unsubscribePedidos) unsubscribePedidos();
      if (unsubscribeEstoque) unsubscribeEstoque();
      if (soundObject) {
        soundObject.unloadAsync();
      }
    };
  }, []);

  const adicionarMesa = async ({ nomeCliente, numeroMesa }) => {
    const mesaNumeroExistente = mesas.find(
      (mesa) => mesa.numero === numeroMesa
    );
    if (mesaNumeroExistente) {
      Alert.alert("Erro", `Já existe uma mesa com o número "${numeroMesa}".`);
      return;
    }

    const mesaNomeExistente = mesas.find(
      (mesa) => mesa.nomeCliente === nomeCliente
    );
    if (mesaNomeExistente) {
      Alert.alert("Erro", `Já existe uma mesa com o cliente "${nomeCliente}".`);
      return;
    }

    const novaMesa = {
      numero: numeroMesa,
      nomeCliente,
      pedidos: [],
      posX: 0,
      posY: 0,
      status: "aberta",
    };
    try {
      await adicionarMesaNoFirebase(novaMesa);
      setModalVisible(false);
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível adicionar a mesa: " + error.message
      );
    }
  };

  const moverMesa = async (mesaId, x, y) => {
    const mesa = mesas.find((m) => m.id === mesaId);
    if (mesa) {
      const novoX = (mesa.posX || 0) + (x || 0);
      const novoY = (mesa.posY || 0) + (y || 0);
      try {
        console.log("(NOBRIDGE) LOG Tentando mover mesa:", {
          mesaId,
          novoX,
          novoY,
        });
        await atualizarMesa(mesaId, { posX: novoX, posY: novoY });
        console.log("(NOBRIDGE) LOG Mesa movida com sucesso:", {
          mesaId,
          novoX,
          novoY,
        });
      } catch (error) {
        console.error(
          "(NOBRIDGE) ERROR Erro ao mover mesa no HomeScreen:",
          error
        );
        Alert.alert("Erro", "Não foi possível mover a mesa: " + error.message);
      }
    }
  };

  const soltarMesa = (mesaId) => {
    const mesa = mesas.find((m) => m.id === mesaId);
    if (!mesaSelecionada) {
      setMesaSelecionada(mesaId);
      const isJuntada = mesa && mesa.numero.includes("-");
      Alert.alert(
        "Mesa Selecionada",
        isJuntada
          ? 'Escolha "Separar", "Remover" ou junte com outra mesa.'
          : "Solte outra mesa para juntar ou escolha 'Remover'.",
        [
          { text: "Cancelar", onPress: () => setMesaSelecionada(null) },
          ...(isJuntada
            ? [{ text: "Separar", onPress: () => separarMesas(mesaId) }]
            : []),
          {
            text: "Remover",
            onPress: async () => {
              await removerMesaLocal(mesaId);
              setMesaSelecionada(null);
            },
            style: "destructive",
          },
          { text: "Ok" },
        ]
      );
    } else if (mesaSelecionada !== mesaId) {
      Alert.alert("Juntar Mesas", "Deseja juntar essas mesas?", [
        { text: "Cancelar", onPress: () => setMesaSelecionada(null) },
        {
          text: "Juntar",
          onPress: async () => {
            try {
              await juntarMesas(mesaSelecionada, mesaId);
              setMesaSelecionada(null);
            } catch (error) {
              Alert.alert("Erro", "Não foi possível juntar as mesas.");
            }
          },
        },
      ]);
    } else {
      setMesaSelecionada(null);
    }
  };

  const separarMesas = async (mesaId) => {
    const mesa = mesas.find((m) => m.id === mesaId);
    if (!mesa || !mesa.numero.includes("-")) return;

    const [numero1, numero2] = mesa.numero.split("-");
    const [nome1, nome2] = mesa.nomeCliente.split(" & ");
    try {
      const freshDb = await ensureFirebaseInitialized();
      const pedidosSnapshot = await freshDb.ref("pedidos").once("value");
      const todosPedidos = pedidosSnapshot.val() || {};
      const pedidosMesaJunta = Object.entries(todosPedidos)
        .filter(([_, pedido]) => pedido.mesa === mesa.numero)
        .map(([id, pedido]) => ({ id, ...pedido }));

      const pedidosMesa1 = pedidosMesaJunta.filter(
        (p) => p.mesaOriginal === numero1 || !p.mesaOriginal
      );
      const pedidosMesa2 = pedidosMesaJunta.filter(
        (p) => p.mesaOriginal === numero2
      );

      if (pedidosMesa2.length === 0 && pedidosMesa1.length > 0) {
        const metade = Math.ceil(pedidosMesa1.length / 2);
        pedidosMesa2.push(...pedidosMesa1.splice(metade));
      }

      const novaMesa1 = {
        numero: numero1,
        nomeCliente: nome1,
        posX: mesa.posX || 0,
        posY: (mesa.posY || 0) - 50,
        status: "aberta",
        createdAt: mesa.createdAt,
      };
      const novaMesa2 = {
        numero: numero2,
        nomeCliente: nome2,
        posX: mesa.posX || 0,
        posY: (mesa.posY || 0) + 50,
        status: "aberta",
        createdAt: mesa.createdAt,
      };

      const updates = {};
      pedidosMesa1.forEach((p) => {
        updates[`pedidos/${p.id}/mesa`] = numero1;
        if (p.mesaOriginal) updates[`pedidos/${p.id}/mesaOriginal`] = null;
      });
      pedidosMesa2.forEach((p) => {
        updates[`pedidos/${p.id}/mesa`] = numero2;
        if (p.mesaOriginal) updates[`pedidos/${p.id}/mesaOriginal`] = null;
      });

      await Promise.all([
        freshDb.ref(`mesas/${mesaId}`).remove(),
        adicionarMesaNoFirebase(novaMesa1),
        adicionarMesaNoFirebase(novaMesa2),
      ]);

      await freshDb.ref().update(updates);

      setMesaSelecionada(null);
    } catch (error) {
      console.error("(NOBRIDGE) ERROR Erro ao separar mesas:", error);
      Alert.alert(
        "Erro",
        "Não foi possível separar as mesas: " + error.message
      );
    }
  };

  const verPedidos = (mesa) => {
    setMesaDetalhes(mesa);
    setDetalhesVisible(true);
  };

  const handleAdicionarPedido = async (mesaNumero, itens) => {
    try {
      await adicionarPedido(mesaNumero, itens);
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível adicionar o pedido: " + error.message
      );
    }
  };

  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
        sound: "default",
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("(NOBRIDGE) LOG Permissão de notificação negada");
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("(NOBRIDGE) LOG Token de notificação:", token);
    return token;
  }

  const handleAtualizarMesa = (novaMesa) => {
    setMesas((prevMesas) =>
      prevMesas.map((m) => (m.id === novaMesa.id ? novaMesa : m))
    );
    setMesaDetalhes(novaMesa);
  };

  const removerMesaLocal = async (mesaId) => {
    const mesa = mesas.find((m) => m.id === mesaId);
    if (!mesa) {
      Alert.alert("Erro", "Mesa não encontrada.");
      return;
    }

    const mesaPedidos = pedidos.filter((p) => p.mesa === mesa.numero);
    const temPedidosAbertos = mesaPedidos.some((p) => !p.entregue);

    if (mesa.status === "aberta" && mesaPedidos.length > 0) {
      Alert.alert(
        "Erro",
        "Não é possível remover uma mesa aberta com pedidos."
      );
      return;
    }

    if (mesa.status === "fechada" && temPedidosAbertos) {
      Alert.alert(
        "Erro",
        "Não é possível remover uma mesa com pedidos abertos."
      );
      return;
    }

    try {
      await removerPedidosDaMesa(mesa.numero);
      await removerMesa(mesaId);
      setMesas((prevMesas) => prevMesas.filter((m) => m.id !== mesaId));
      if (mesaDetalhes && mesaDetalhes.id === mesaId) {
        setMesaDetalhes(null);
        setDetalhesVisible(false);
      }
      setMesaSelecionada(null);
      Alert.alert("Sucesso", "Mesa removida com sucesso!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível remover a mesa: " + error.message);
    }
  };

  const checkPassword = (action) => {
    setActionToPerform(() => action); // Armazena a ação a ser executada
    setPasswordModalVisible(true); // Abre o modal
  };

  const handlePasswordSubmit = () => {
    if (password === "1249") {
      setPasswordModalVisible(false);
      setPassword("");
      if (actionToPerform) {
        actionToPerform(); // Executa a ação armazenada
      }
    } else {
      Alert.alert("Erro", "Senha incorreta!");
      setPassword("");
    }
  };

  const navigationView = () => (
    <View style={styles.drawerContainer}>
      <Text style={styles.drawerTitle}>Menu</Text>
      <View style={{ marginVertical: 10 }}>
        <Button
          title="Adicionar Mesa"
          onPress={() => {
            setModalVisible(true);
            drawer.closeDrawer();
          }}
          color="#FFA500"
        />
      </View>
      <View style={{ marginVertical: 10 }}>
        <Button
          title="Controle de Estoque"
          onPress={() =>
            checkPassword(() => {
              setEstoqueVisible(true);
              drawer.closeDrawer();
            })
          }
          color="#FFA500"
        />
      </View>
      <View style={{ marginVertical: 10 }}>
        <Button
          title="Gerenciar Estoque/Cardápio"
          onPress={() =>
            checkPassword(() => {
              setGerenciarVisible(true);
              drawer.closeDrawer();
            })
          }
          color="#FFA500"
        />
      </View>
      <View style={{ marginVertical: 10 }}>
        <Button
          title="Gerenciar Fichas Técnicas"
          onPress={() =>
            checkPassword(() => {
              setFichasTecnicasVisible(true);
              drawer.closeDrawer();
            })
          }
          color="#FFA500"
        />
      </View>
      <View style={{ marginVertical: 10 }}>
        <Button
          title="Histórico"
          onPress={() => {
            navigation.navigate("HistoricoPedidos");
            drawer.closeDrawer();
          }}
          color="#FFA500"
        />
      </View>
    </View>
  );

  return (
    <DrawerLayoutAndroid
      ref={(ref) => setDrawer(ref)}
      drawerWidth={250}
      drawerPosition="left"
      renderNavigationView={navigationView}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => drawer.openDrawer()}>
            <Icon name="menu" size={30} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <MaterialCommunityIcons
              name="chef-hat"
              size={30}
              color="#FFF"
              style={styles.chefHatIcon}
            />
            <Text style={styles.titulo}>Mesas do Restaurante</Text>
          </View>
        </View>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome do cliente"
          placeholderTextColor="#aaa"
          value={searchText}
          onChangeText={setSearchText}
        />
        <ScrollView contentContainerStyle={styles.grade}>
          {mesas
            .slice()
            .filter((mesa) =>
              mesa.nomeCliente.toLowerCase().includes(searchText.toLowerCase())
            )
            .sort((a, b) => {
              const numA = parseInt(a.numero.match(/\d+/)[0], 10);
              const numB = parseInt(b.numero.match(/\d+/)[0], 10);
              return numA - numB;
            })
            .map((mesa) => {
              const mesaPedidos = pedidos.filter((p) => p.mesa === mesa.numero);
              return (
                <Mesa
                  key={mesa.id}
                  mesa={mesa}
                  pedidos={mesaPedidos}
                  onMove={moverMesa}
                  onDrop={soltarMesa}
                  onVerPedidos={verPedidos}
                />
              );
            })}
        </ScrollView>
        <AdicionarMesaModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onAdicionar={adicionarMesa}
        />
        {mesaDetalhes && (
          <DetalhesMesaModal
            visible={detalhesVisible}
            onClose={() => setDetalhesVisible(false)}
            mesa={mesaDetalhes}
            pedidos={pedidos.filter((p) => p.mesa === mesaDetalhes.numero)}
            onAdicionarPedido={handleAdicionarPedido}
            onAtualizarMesa={handleAtualizarMesa}
          />
        )}
        <ControleEstoqueModal
          visible={estoqueVisible}
          onClose={() => setEstoqueVisible(false)}
        />
        <GerenciarEstoqueCardapioModal
          visible={gerenciarVisible}
          onClose={() => setGerenciarVisible(false)}
        />
        <GerenciarFichasTecnicasModal
          visible={fichasTecnicasVisible}
          onClose={() => setFichasTecnicasVisible(false)}
        />
        <Modal
          visible={passwordModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setPasswordModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.passwordModal}>
              <Text style={styles.modalTitle}>Digite a Senha</Text>
              <TextInput
                style={styles.passwordInput}
                placeholder="Senha"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor="#888"
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Confirmar"
                  onPress={handlePasswordSubmit}
                  color="#FFA500"
                />
                <Button
                  title="Cancelar"
                  onPress={() => {
                    setPasswordModalVisible(false);
                    setPassword("");
                    setActionToPerform(null);
                  }}
                  color="#FF4444"
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </DrawerLayoutAndroid>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#5C4329",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  chefHatIcon: {
    position: "absolute",
    top: -10,
    left: 20,
    transform: [{ rotate: "-20deg" }],
  },
  titulo: {
    fontSize: 24,
    textAlign: "center",
    color: "#fff",
  },
  grade: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
  },
  drawerContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  searchInput: {
    height: 40,
    borderColor: "#fff",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    color: "#fff",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  passwordModal: {
    width: "80%",
    padding: 20,
    backgroundColor: "#FFF",
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#5C4329",
  },
  passwordInput: {
    width: "100%",
    height: 40,
    borderColor: "#5C4329",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    color: "#000",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
});
