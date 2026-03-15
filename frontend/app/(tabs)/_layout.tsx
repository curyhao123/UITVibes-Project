import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: AppColors.primary,
        tabBarInactiveTintColor: AppColors.textMuted,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: AppColors.border,
          backgroundColor: AppColors.surfaceElevated,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Feather name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => <Feather name="search" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ color, size }) => (
            <View style={styles.createIconWrap}>
              <Feather name="plus" size={28} color="white" />
            </View>
          ),
          tabBarIconStyle: { marginBottom: 4 },
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          title: 'Message',
          tabBarIcon: ({ color, size }) => <Feather name="message-circle" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Feather name="user" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
  },
});
