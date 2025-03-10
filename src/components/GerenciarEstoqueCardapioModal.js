import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Button,
  Alert,
  ScrollView, // Adicionado ScrollView
} from "react-native";
import { Picker } from "@react-native-picker/picker"; // Certifique-se de que isso está correto após a instalação

import {
  adicionarNovoItemEstoque,
  adicionarNovoItemCardapio,
} from "../services/mesaService";

export default function GerenciarEstoqueCardapioModal({ visible, onClose }) {
  // Campos para estoque
  const [nomeEstoque, setNomeEstoque] = useState("");
  const [quantidadeEstoque, setQuantidadeEstoque] = useState("");
  const [unidadeEstoque, setUnidadeEstoque] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");

  // Campos para cardápio
  const [nomeCardapio, setNomeCardapio] = useState("");
  const [precoUnitario, setPrecoUnitario] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [categoria, setCategoria] = useState("");

  // Lista de categorias existentes
  const categorias = [
    "Bebidas com Alcool",
    "Bebidas sem Alcool",
    "Lanches",
    "Refeições",
    "Sucos e Agua",
  ];

  const handleAdicionarEstoque = async () => {
    if (!nomeEstoque || !quantidadeEstoque) {
      Alert.alert("Erro", "Nome e quantidade são obrigatórios.");
      return;
    }
    const nomeLimpo = nomeEstoque.trim();
    if (!nomeLimpo) {
      Alert.alert("Erro", "O nome do item não pode ser vazio.");
      return;
    }
    try {
      await adicionarNovoItemEstoque(
        nomeLimpo,
        quantidadeEstoque,
        unidadeEstoque,
        estoqueMinimo
      );
      Alert.alert("Sucesso", `${nomeLimpo} adicionado ao estoque!`);
      setNomeEstoque("");
      setQuantidadeEstoque("");
      setUnidadeEstoque("");
      setEstoqueMinimo("");
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível adicionar ao estoque: " + error.message
      );
    }
  };

  const handleAdicionarCardapio = async () => {
    if (!nomeCardapio || !precoUnitario || !categoria) {
      Alert.alert("Erro", "Nome, preço unitário e categoria são obrigatórios.");
      return;
    }
    const nomeLimpo = nomeCardapio.trim();
    if (!nomeLimpo) {
      Alert.alert("Erro", "O nome do item não pode ser vazio.");
      return;
    }
    try {
      console.log("(NOBRIDGE) LOG Adicionando ao cardápio:", {
        nome: nomeLimpo,
        precoUnitario,
        imagemUrl,
        categoria,
      });
      await adicionarNovoItemCardapio(
        nomeLimpo,
        precoUnitario,
        imagemUrl,
        categoria
      );
      Alert.alert(
        "Sucesso",
        `${nomeLimpo} adicionado ao cardápio em ${categoria}!`
      );
      setNomeCardapio("");
      setPrecoUnitario("");
      setImagemUrl("");
      setCategoria("");
    } catch (error) {
      Alert.alert(
        "Erro",
        "Não foi possível adicionar ao cardápio: " + error.message
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.modalContent}>
            <Text style={styles.titulo}>Gerenciar Estoque e Cardápio</Text>

            {/* Seção para adicionar ao estoque */}
            <Text style={styles.subtitulo}>Adicionar ao Estoque</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do item (ex.: Coxinha)"
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
              placeholder="Estoque Mínimo (ex.: 2)"
              value={estoqueMinimo}
              keyboardType="numeric"
              onChangeText={setEstoqueMinimo}
            />
            <Button
              title="Adicionar ao Estoque"
              onPress={handleAdicionarEstoque}
              color="#28a745"
            />

            {/* Seção para adicionar ao cardápio */}
            <Text style={styles.subtitulo}>Adicionar ao Cardápio</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome do item (ex.: Suco de Laranja)"
              value={nomeCardapio}
              onChangeText={setNomeCardapio}
            />
            <TextInput
              style={styles.input}
              placeholder="Preço Unitário (ex.: 7.50)"
              value={precoUnitario}
              keyboardType="numeric"
              onChangeText={setPrecoUnitario}
            />
            <TextInput
              style={styles.input}
              placeholder="URL da imagem (ex.: https://exemplo.com/imagem.jpg)"
              value={imagemUrl}
              onChangeText={setImagemUrl}
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
              title="Adicionar ao Cardápio"
              onPress={handleAdicionarCardapio}
              color="#007bff"
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
    flexGrow: 1, // Permite que o conteúdo cresça dentro do ScrollView
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
