import React, { useState } from "react";
import { Modal, View, Text, TextInput, Button, StyleSheet } from "react-native";
import { adicionarMesaNoFirebase } from "../services/mesaService"; // Importe a função do serviço

export default function AdicionarMesaModal({ visible, onClose, onAdicionar }) {
  const [nomeCliente, setNomeCliente] = useState("");

  // Função para gerar um número aleatório entre 1 e 999
  const gerarNumeroMesa = () => {
    return Math.floor(Math.random() * 999) + 1;
  };

  const handleAdicionar = async () => {
    if (nomeCliente) {
      try {
        const numeroMesa = gerarNumeroMesa(); // Gera o número dinamicamente
        const mesaData = { nomeCliente, numeroMesa };

        // Usa a função do mesaService para adicionar ao Realtime Database
        const mesaId = await adicionarMesaNoFirebase(mesaData);

        // Chama a função onAdicionar para atualizar a UI, se necessário
        onAdicionar({ ...mesaData, id: mesaId });

        // Limpa o campo e fecha o modal
        setNomeCliente("");
        onClose();
      } catch (error) {
        console.error("Erro ao adicionar mesa:", error);
        alert("Erro ao adicionar a mesa. Tente novamente.");
      }
    } else {
      alert("Preencha o nome do cliente!");
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.titulo}>Adicionar Mesa</Text>
          <TextInput
            style={styles.input}
            placeholder="Nome do Cliente"
            value={nomeCliente}
            onChangeText={setNomeCliente}
          />
          <View style={styles.botoes}>
            <Button title="Cancelar" onPress={onClose} color="#ff4444" />
            <Button title="Adicionar" onPress={handleAdicionar} />
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
    width: 300,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
  },
  titulo: {
    fontSize: 20,
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  botoes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
