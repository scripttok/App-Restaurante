import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar, View, StyleSheet } from "react-native";
import HomeScreen from "./src/screens/HomeScreen"; // Ajuste o caminho conforme necessário
import HistoricoPedidosScreen from "./src/screens/HistoricoPedidosScreen"; // Ajuste o caminho conforme necessário

const Drawer = createDrawerNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <View style={styles.container}>
          <Drawer.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: { backgroundColor: "#5C4329" },
              headerTintColor: "#FFA500",
              headerTitleStyle: { fontWeight: "bold" },
            }}
          >
            <Drawer.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "Início", headerShown: false }}
            />
            <Drawer.Screen
              name="HistoricoPedidos"
              component={HistoricoPedidosScreen}
              options={{
                title: "Histórico de Pedidos",
                headerShown: false, // Remove o ícone do menu hambúrguer
                // Ou use headerShown: false se quiser remover o cabeçalho inteiro
              }}
            />
          </Drawer.Navigator>
          <StatusBar style="auto" />
        </View>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 50,
  },
});
