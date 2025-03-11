import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  StyleSheet,
  Button,
  TextInput,
  Alert,
} from "react-native";
import {
  getEstoque,
  adicionarNovoItemEstoque,
  removerEstoque,
  removerItemEstoqueECardapio,
  atualizarQuantidadeEstoque,
} from "../services/mesaService";
import { ensureFirebaseInitialized } from "../services/firebase";

export default function ControleEstoqueModal({ visible, onClose }) {
  const [estoque, setEstoque] = useState([]);
  const [quantidades, setQuantidades] = useState({});
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    let unsubscribe;
    if (visible) {
      unsubscribe = getEstoque((data) => {
        console.log("Estoque recebido no modal:", data);
        setEstoque(data);
        const initialQuantidades = data.reduce((acc, item) => {
          acc[item.id] = "";
          return acc;
        }, {});
        setQuantidades(initialQuantidades);
      });
    }
    return () => {
      if (unsubscribe) {
        console.log("Desmontando listener de estoque no modal");
        unsubscribe();
      }
    };
  }, [visible]);

  const handleQuantidadeChange = (itemId, valor) => {
    setQuantidades((prev) => ({
      ...prev,
      [itemId]: valor,
    }));
  };

  const handleAdicionarEstoque = async (itemId, nome) => {
    const qtdAdicionar = parseFloat(quantidades[itemId]) || 0;
    if (qtdAdicionar <= 0) {
      Alert.alert("Erro", "Digite uma quantidade válida para adicionar.");
      return;
    }
    try {
      console.log("Iniciando adição ao estoque:", {
        nome,
        quantidade: qtdAdicionar,
      });
      await adicionarNovoItemEstoque(nome, qtdAdicionar, "unidades", "0");
      Alert.alert(
        "Sucesso",
        `${qtdAdicionar} unidade(s) de ${nome} adicionada(s) ao estoque!`
      );
      setQuantidades((prev) => ({
        ...prev,
        [itemId]: "",
      }));
    } catch (error) {
      console.error("Falha ao adicionar ao estoque:", error);
      Alert.alert(
        "Erro",
        `Não foi possível adicionar ${nome}: ${error.message}`
      );
    }
  };

  const handleRemoverEstoque = async (
    itemId,
    nome,
    quantidadeAtual,
    categoriaItem
  ) => {
    const qtdRemover = parseFloat(quantidades[itemId]) || 0;
    if (qtdRemover <= 0) {
      Alert.alert("Erro", "Digite uma quantidade válida para remover.");
      return;
    }
    if (qtdRemover > quantidadeAtual) {
      Alert.alert("Erro", "Quantidade a remover excede o estoque atual.");
      return;
    }
    try {
      console.log("Tentando remover do estoque:", {
        itemId,
        quantidade: qtdRemover,
      });
      const novaQuantidade = quantidadeAtual - qtdRemover;
      await atualizarQuantidadeEstoque(itemId, novaQuantidade, categoriaItem);
      Alert.alert(
        "Sucesso",
        `${qtdRemover} unidade(s) de ${nome} removida(s) do estoque!` +
          (novaQuantidade <= 0 ? " Item também removido do cardápio." : "")
      );
      setQuantidades((prev) => ({
        ...prev,
        [itemId]: "",
      }));
    } catch (error) {
      console.error("Erro ao remover do estoque:", error);
      Alert.alert("Erro", `Não foi possível remover ${nome}: ${error.message}`);
    }
  };

  const handleRemoverItemCompleto = async (itemId, nome, categoriaItem) => {
    try {
      if (!categoriaItem) {
        console.log(
          `(NOBRIDGE) LOG Item ${nome} sem categoria, removendo apenas do estoque`
        );
        const db = await ensureFirebaseInitialized();
        await db.ref(`estoque/${itemId}`).remove();
        Alert.alert(
          "Sucesso",
          `${nome} removido do estoque (sem categoria para cardápio)`
        );
      } else {
        await removerItemEstoqueECardapio(itemId, categoriaItem);
        Alert.alert("Sucesso", `${nome} removido do estoque e cardápio!`);
      }
    } catch (error) {
      console.error("Erro ao remover item completamente:", error);
      Alert.alert("Erro", `Não foi possível remover ${nome}: ${error.message}`);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={styles.itemText}>
        {item.nome} - {item.quantidade} {item.unidade}{" "}
        {item.categoria ? `(${item.categoria})` : ""}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Quantidade"
        value={quantidades[item.id] || ""}
        keyboardType="numeric"
        onChangeText={(text) => handleQuantidadeChange(item.id, text)}
      />
      <View style={styles.actions}>
        <Button
          title="Adicionar"
          onPress={() => handleAdicionarEstoque(item.id, item.nome)}
          color="#28a745"
        />
        <Button
          title="Remover"
          onPress={() =>
            handleRemoverEstoque(
              item.id,
              item.nome,
              item.quantidade,
              item.categoria
            )
          }
          color="#ff4444"
        />
        <Button
          title="Remover Tudo"
          onPress={() =>
            handleRemoverItemCompleto(item.id, item.nome, item.categoria)
          }
          color="#dc3545"
        />
      </View>
    </View>
  );

  const filteredEstoque = estoque.filter((item) =>
    item.nome.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>Controle de Estoque</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome do item"
            placeholderTextColor="#aaa"
            value={searchText}
            onChangeText={setSearchText}
          />
          <FlatList
            data={filteredEstoque}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            style={styles.flatList}
            contentContainerStyle={styles.flatListContent}
            ListEmptyComponent={<Text>Sem itens no estoque</Text>}
          />
          <View style={styles.botoes}>
            <Button title="Fechar" onPress={onClose} />
          </View>
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
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 350,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  titulo: {
    fontSize: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    fontSize: 16,
  },
  flatList: {
    flexGrow: 0,
    maxHeight: 400,
  },
  flatListContent: {
    paddingBottom: 10,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  itemText: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 8,
    marginBottom: 10,
    borderRadius: 5,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  botoes: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
});
