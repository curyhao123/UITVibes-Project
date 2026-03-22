import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { AppColors } from '../../constants/theme';
import { Typography } from '../../constants/typography';
import { CustomTabBar } from '../../components/CustomTabBar';

/**
 * Bottom tabs only (no `index` route in this folder) — Home, Search, Music, Create, Reels, Message, Profile.
 * Unified Feather stroke weight for tab icons.
 */
const TAB_ICON_SIZE = 22;
const CREATE_SIZE = 20;
const CREATE_BUTTON = 42;

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: AppColors.primary,
        tabBarInactiveTintColor: AppColors.iconMuted,
        tabBarStyle: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: AppColors.border,
          backgroundColor: AppColors.surfaceElevated,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 2 : 6,
          minHeight: 52,
          ...Platform.select({
            ios: {
              shadowColor: '#2D3748',
              shadowOffset: { width: 0, height: -1 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
            },
            android: { elevation: 4 },
          }),
        },
        tabBarLabelStyle: {
          ...Typography.tabLabel,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={TAB_ICON_SIZE} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => (
            <Feather name="search" size={TAB_ICON_SIZE} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="music"
        options={{
          title: 'Music',
          tabBarIcon: ({ color }) => (
            <Feather name="music" size={TAB_ICON_SIZE} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarActiveTintColor: AppColors.primary,
          tabBarInactiveTintColor: AppColors.primary,
          tabBarIcon: () => (
            <View style={styles.createIconWrap}>
              <Feather name="plus" size={CREATE_SIZE} color="#FFFFFF" strokeWidth={2.2} />
            </View>
          ),
          tabBarLabelStyle: {
            ...Typography.tabLabel,
            marginTop: 4,
          },
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color }) => (
            <Feather name="video" size={TAB_ICON_SIZE} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="message"
        options={{
          title: 'Message',
          tabBarIcon: ({ color }) => (
            <Feather name="message-circle" size={TAB_ICON_SIZE} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={TAB_ICON_SIZE} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  createIconWrap: {
    width: CREATE_BUTTON,
    height: CREATE_BUTTON,
    borderRadius: CREATE_BUTTON / 2,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 0,
    ...Platform.select({
      ios: {
        shadowColor: AppColors.primaryDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.28,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },
});
