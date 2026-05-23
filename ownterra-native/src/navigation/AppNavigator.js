import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import DashboardScreen from "../screens/DashboardScreen";
import LotsScreen from "../screens/LotsScreen";
import ClientsScreen from "../screens/ClientsScreen";
import SalesScreen from "../screens/SalesScreen";
import DocumentsScreen from "../screens/DocumentsScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme/colors";

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.forest,
    border: colors.line,
  },
};

const icons = {
  Dashboard: "grid-outline",
  Lotes: "map-outline",
  Clientes: "people-outline",
  Ventas: "document-text-outline",
  Docs: "folder-open-outline",
  Perfil: "person-circle-outline",
};

export default function AppNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.forest,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            height: 74,
            paddingTop: 8,
            paddingBottom: 10,
            backgroundColor: colors.surface,
            borderTopColor: colors.line,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={icons[route.name]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Lotes" component={LotsScreen} />
        <Tab.Screen name="Clientes" component={ClientsScreen} />
        <Tab.Screen name="Ventas" component={SalesScreen} />
        <Tab.Screen name="Docs" component={DocumentsScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
