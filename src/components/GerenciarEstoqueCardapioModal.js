import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Alert,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import {
  adicionarNovoItemEstoque,
  adicionarNovoItemCardapio,
} from "../services/mesaService";

export default function GerenciarEstoqueCardapioModal({ visible, onClose }) {
  // Campos unificados para estoque e cardápio
  const [nomeEstoque, setNomeEstoque] = useState("");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState("");
  const [unidadeEstoque, setUnidadeEstoque] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descricao, setDescricao] = useState("");

  // Lista de categorias existentes
  const categorias = [
    "Bebidas com Alcool",
    "Bebidas sem Alcool",
    "Lanches",
    "Refeições",
    "Sucos e Agua",
  ];

  const handleAdicionarEstoqueECardapio = async () => {
    // Validação dos campos obrigatórios
    if (!nomeEstoque || !quantidadeEstoque || !precoUnitario || !categoria) {
      Alert.alert(
        "Erro",
        "Nome, quantidade, preço unitário e categoria são obrigatórios."
      );
      return;
    }

    const nomeLimpo = nomeEstoque.trim();
    if (!nomeLimpo) {
      Alert.alert("Erro", "O nome do item não pode ser vazio.");
      return;
    }

    try {
      // Adicionar ao estoque
      await adicionarNovoItemEstoque(
        nomeLimpo,
        quantidadeEstoque,
        unidadeEstoque,
        estoqueMinimo
      );

      // Adicionar ao cardápio (assumindo que a imagem é opcional)
      await adicionarNovoItemCardapio(
        nomeLimpo,
        precoUnitario,
        "", // URL da imagem
        categoria,
        descricao || "Item adicionado via estoque" // Passe a descrição ou valor padrão
      );

      Alert.alert(
        "Sucesso",
        `${nomeLimpo} adicionado ao estoque e ao cardápio em ${categoria}!`
      );

      // Limpar os campos após o sucesso
      setNomeEstoque("");
      setQuantidadeEstoque("");
      setUnidadeEstoque("");
      setEstoqueMinimo("");
      setPrecoUnitario("");
      setCategoria("");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível adicionar: " + error.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.modalContent}>
            <Text style={styles.titulo}>Gerenciar Estoque e Cardápio</Text>

            {/* Seção unificada para adicionar ao estoque e cardápio */}
            <Text style={styles.subtitulo}>
              Adicionar ao Estoque e Cardápio
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do item (ex.: Cerveja)"
              value={nomeEstoque}
              onChangeText={setNomeEstoque}
            />
            <TextInput
              style={styles.input}
              placeholder="Quantidade (ex.: 10)"
              value={quantidadeEstoque}
              keyboardType="numeric"
              onChangeText={setQuantidadeEstoque}
            />
            <TextInput
              style={styles.input}
              placeholder="Unidade (ex.: unidades)"
              value={unidadeEstoque}
              onChangeText={setUnidadeEstoque}
            />
            <TextInput
              style={styles.input}
              placeholder="Descrição (ex.: Lata 350ml)"
              value={descricao}
              onChangeText={setDescricao}
            />
            <TextInput
              style={styles.input}
              placeholder="Estoque Mínimo (ex.: 2)"
              value={estoqueMinimo}
              keyboardType="numeric"
              onChangeText={setEstoqueMinimo}
            />
            <TextInput
              style={styles.input}
              placeholder="Preço Unitário (ex.: 5.00)"
              value={precoUnitario}
              keyboardType="numeric"
              onChangeText={setPrecoUnitario}
            />
            <Picker
              selectedValue={categoria}
              style={styles.picker}
              onValueChange={(itemValue) => setCategoria(itemValue)}
            >
              <Picker.Item label="Selecione uma categoria" value="" />
              {categorias.map((cat) => (
                <Picker.Item key={cat} label={cat} value={cat} />
              ))}
            </Picker>
            <Button
              title="Adicionar ao Estoque e Cardápio"
              onPress={handleAdicionarEstoqueECardapio}
              color="#28a745"
            />

            {/* Botão de fechar */}
            <View style={styles.botoes}>
              <Button title="Fechar" onPress={onClose} />
            </View>
          </View>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
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
  subtitulo: {
    fontSize: 16,
    fontWeight: "bold",
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  picker: {
    height: 50,
    width: "100%",
    marginBottom: 10,
  },
  botoes: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
});
