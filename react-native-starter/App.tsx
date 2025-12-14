import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'

import { AuthProvider, useAuth } from './hooks/useAuth'
import { LoginScreen } from './screens/LoginScreen'
import { HomeScreen } from './screens/HomeScreen'
// Import other screens as you build them:
// import { QueueScreen } from './screens/QueueScreen'
// import { NoSkipsScreen } from './screens/NoSkipsScreen'
// import { ListScreen } from './screens/ListScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// Placeholder screens - replace with actual implementations
function QueueScreen() {
  return null // TODO: Implement
}
function NoSkipsScreen() {
  return null // TODO: Implement
}
function ListScreen() {
  return null // TODO: Implement
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home'

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Queue') {
            iconName = focused ? 'list' : 'list-outline'
          } else if (route.name === 'NoSkips') {
            iconName = focused ? 'heart' : 'heart-outline'
          } else if (route.name === 'List') {
            iconName = focused ? 'journal' : 'journal-outline'
          }

          return <Ionicons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#1a1a1a',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="Queue" 
        component={QueueScreen}
        options={{ tabBarLabel: 'Queue' }}
      />
      <Tab.Screen 
        name="NoSkips" 
        component={NoSkipsScreen}
        options={{ tabBarLabel: 'No Skips' }}
      />
      <Tab.Screen 
        name="List" 
        component={ListScreen}
        options={{ tabBarLabel: 'The List' }}
      />
    </Tab.Navigator>
  )
}

function Navigation() {
  const { user, loading } = useAuth()

  if (loading) {
    return null // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Navigation />
    </AuthProvider>
  )
}
