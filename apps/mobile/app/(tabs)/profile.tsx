import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { showMessage } from 'react-native-flash-message';
import { useTheme } from '../../src/providers/ThemeProvider';
import { useAuth } from '../../src/providers/AuthProvider';
import { Card, CardContent, Button, Input } from '../../src/components/ui';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  colors: any;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  subtitle,
  rightElement,
  onPress,
  showChevron = true,
  colors,
}) => {
  return (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name={icon as any} size={20} color={colors.primary} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {rightElement}
        {showChevron && onPress && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function ProfileScreen() {
  const { colors } = useTheme();
  const {
    user,
    signOut,
    updateProfile,
    isBiometricsEnabled,
    enableBiometrics,
    disableBiometrics,
  } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [marketingEnabled, setMarketingEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editForm);
      setIsEditing(false);
      showMessage({
        message: 'Profile updated successfully',
        type: 'success',
      });
    } catch (error: any) {
      showMessage({
        message: error.message || 'Failed to update profile',
        type: 'danger',
      });
    }
  };

  const handleCancelEdit = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || '',
    });
    setIsEditing(false);
  };

  const handleChangeAvatar = async () => {
    Alert.alert(
      'Change Avatar',
      'Choose how you want to update your profile picture',
      [
        { text: 'Take Photo', onPress: () => takePhoto() },
        { text: 'Choose from Library', onPress: () => pickImage() },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await updateProfileImage(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await updateProfileImage(result.assets[0].uri);
    }
  };

  const updateProfileImage = async (uri: string) => {
    try {
      await updateProfile({ avatar_url: uri });
      showMessage({
        message: 'Profile picture updated successfully',
        type: 'success',
      });
    } catch (error: any) {
      showMessage({
        message: error.message || 'Failed to update profile picture',
        type: 'danger',
      });
    }
  };

  const handleBiometricsToggle = async (value: boolean) => {
    try {
      if (value) {
        await enableBiometrics();
        showMessage({
          message: 'Biometric authentication enabled',
          type: 'success',
        });
      } else {
        await disableBiometrics();
        showMessage({
          message: 'Biometric authentication disabled',
          type: 'info',
        });
      }
    } catch (error: any) {
      showMessage({
        message: error.message || 'Failed to update biometric settings',
        type: 'danger',
      });
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            showMessage({
              message: 'Account deletion feature coming soon',
              type: 'info',
            });
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    scrollContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    profileSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.card,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.primary + '20',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.primary,
    },
    editAvatarButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      borderRadius: 16,
      width: 32,
      height: 32,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    userName: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    userEmail: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 16,
    },
    editButton: {
      paddingHorizontal: 24,
      paddingVertical: 8,
    },
    editForm: {
      marginBottom: 32,
    },
    editActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
    },
    editActionButton: {
      flex: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 12,
    },
    settingsCard: {
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
    },
    settingSubtitle: {
      fontSize: 14,
    },
    settingRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    dangerSection: {
      marginTop: 32,
    },
    dangerButton: {
      backgroundColor: colors.error,
      marginBottom: 12,
    },
    version: {
      textAlign: 'center',
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 24,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={colors.primary} />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={handleChangeAvatar}>
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>

          {!isEditing ? (
            <>
              <Text style={styles.userName}>{user?.name || 'Anonymous User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Button
                title="Edit Profile"
                variant="outline"
                size="sm"
                onPress={handleEditProfile}
                style={styles.editButton}
              />
            </>
          ) : (
            <Card style={styles.editForm}>
              <CardContent>
                <Input
                  label="Name"
                  value={editForm.name}
                  onChangeText={(text) => setEditForm({ ...editForm, name: text })}
                  placeholder="Enter your name"
                />
                <Input
                  label="Email"
                  value={editForm.email}
                  onChangeText={(text) => setEditForm({ ...editForm, email: text })}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View style={styles.editActions}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={handleCancelEdit}
                    style={styles.editActionButton}
                  />
                  <Button
                    title="Save"
                    onPress={handleSaveProfile}
                    style={styles.editActionButton}
                  />
                </View>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <Card style={styles.settingsCard}>
            <CardContent style={{ padding: 0 }}>
              <SettingItem
                icon="fingerprint"
                title="Biometric Authentication"
                subtitle="Use Face ID or Touch ID to access the app"
                rightElement={
                  <Switch
                    value={isBiometricsEnabled}
                    onValueChange={handleBiometricsToggle}
                    trackColor={{ false: colors.border, true: colors.primary + '40' }}
                    thumbColor={isBiometricsEnabled ? colors.primary : colors.textSecondary}
                  />
                }
                showChevron={false}
                colors={colors}
              />
              <SettingItem
                icon="key-outline"
                title="Change Password"
                subtitle="Update your account password"
                onPress={() => router.push('/settings/change-password')}
                colors={colors}
              />
            </CardContent>
          </Card>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Card style={styles.settingsCard}>
            <CardContent style={{ padding: 0 }}>
              <SettingItem
                icon="notifications-outline"
                title="Push Notifications"
                subtitle="Receive alerts about your affiliate performance"
                rightElement={
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{ false: colors.border, true: colors.primary + '40' }}
                    thumbColor={notificationsEnabled ? colors.primary : colors.textSecondary}
                  />
                }
                showChevron={false}
                colors={colors}
              />
              <SettingItem
                icon="mail-outline"
                title="Marketing Emails"
                subtitle="Receive tips and product updates"
                rightElement={
                  <Switch
                    value={marketingEnabled}
                    onValueChange={setMarketingEnabled}
                    trackColor={{ false: colors.border, true: colors.primary + '40' }}
                    thumbColor={marketingEnabled ? colors.primary : colors.textSecondary}
                  />
                }
                showChevron={false}
                colors={colors}
              />
            </CardContent>
          </Card>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <Card style={styles.settingsCard}>
            <CardContent style={{ padding: 0 }}>
              <SettingItem
                icon="bar-chart-outline"
                title="Analytics Tracking"
                subtitle="Help improve the app with usage analytics"
                rightElement={
                  <Switch
                    value={analyticsEnabled}
                    onValueChange={setAnalyticsEnabled}
                    trackColor={{ false: colors.border, true: colors.primary + '40' }}
                    thumbColor={analyticsEnabled ? colors.primary : colors.textSecondary}
                  />
                }
                showChevron={false}
                colors={colors}
              />
              <SettingItem
                icon="moon-outline"
                title="Dark Mode"
                subtitle="Automatically switch between light and dark themes"
                onPress={() => router.push('/settings/appearance')}
                colors={colors}
              />
              <SettingItem
                icon="language-outline"
                title="Language"
                subtitle="English"
                onPress={() => router.push('/settings/language')}
                colors={colors}
              />
            </CardContent>
          </Card>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <Card style={styles.settingsCard}>
            <CardContent style={{ padding: 0 }}>
              <SettingItem
                icon="help-circle-outline"
                title="Help Center"
                subtitle="Get help and find answers"
                onPress={() => router.push('/help')}
                colors={colors}
              />
              <SettingItem
                icon="chatbubble-outline"
                title="Contact Support"
                subtitle="Get in touch with our team"
                onPress={() => router.push('/support')}
                colors={colors}
              />
              <SettingItem
                icon="star-outline"
                title="Rate App"
                subtitle="Help us improve with your feedback"
                onPress={() => showMessage({ message: 'Rating feature coming soon!', type: 'info' })}
                colors={colors}
              />
            </CardContent>
          </Card>
        </View>

        {/* Danger Zone */}
        <View style={styles.dangerSection}>
          <Button
            title="Sign Out"
            variant="outline"
            onPress={handleSignOut}
            leftIcon="log-out-outline"
            fullWidth
          />
          <Button
            title="Delete Account"
            variant="danger"
            onPress={handleDeleteAccount}
            leftIcon="trash-outline"
            style={styles.dangerButton}
            fullWidth
          />
        </View>

        <Text style={styles.version}>AffiliateOS v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}