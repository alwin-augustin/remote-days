import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Modal,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCreateRequest } from '../hooks';
import { theme } from '../constants/theme';
import { LoadingSpinner } from './LoadingSpinner';
import { GradientButton } from './GradientButton';
import { LocationType } from '@remotedays/types';

interface CreateRequestModalProps {
    visible: boolean;
    onClose: () => void;
}

export function CreateRequestModal({ visible, onClose }: CreateRequestModalProps) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<LocationType>('home');
    const [reason, setReason] = useState('');

    const createMutation = useCreateRequest();

    const handleSubmit = () => {
        if (!reason.trim()) {
            Alert.alert('Required', 'Please provide a reason for this request.');
            return;
        }

        createMutation.mutate(
            { date, status, reason },
            {
                onSuccess: () => {
                    Alert.alert('Success', 'Request submitted successfully.');
                    setReason('');
                    onClose();
                },
                onError: (error: any) => {
                    Alert.alert('Error', error.response?.data?.message || 'Failed to submit request.');
                },
            }
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>New Request</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        {/* Date Input (Simple string for now, enhanced picker ideally) */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.input}
                                value={date}
                                onChangeText={setDate}
                                placeholder="2025-01-01"
                            />
                        </View>

                        {/* Status Selection */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Requested Status</Text>
                            <View style={styles.statusContainer}>
                                <TouchableOpacity
                                    style={[styles.statusButton, status === 'home' && styles.statusActive]}
                                    onPress={() => setStatus('home')}
                                >
                                    <Ionicons
                                        name="home"
                                        size={20}
                                        color={status === 'home' ? '#fff' : theme.colors.text.primary}
                                    />
                                    <Text style={[styles.statusText, status === 'home' && { color: '#fff' }]}>
                                        Home
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.statusButton, status === 'office' && styles.statusActive]}
                                    onPress={() => setStatus('office')}
                                >
                                    <Ionicons
                                        name="business"
                                        size={20}
                                        color={status === 'office' ? '#fff' : theme.colors.text.primary}
                                    />
                                    <Text style={[styles.statusText, status === 'office' && { color: '#fff' }]}>
                                        Office
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Reason Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Reason</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={reason}
                                onChangeText={setReason}
                                placeholder="Why do you need this change?"
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        <GradientButton
                            title="Submit Request"
                            onPress={handleSubmit}
                            loading={createMutation.isPending}
                            gradient="primary"
                        />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: theme.colors.surface,
        borderTopLeftRadius: theme.borderRadius.xl,
        borderTopRightRadius: theme.borderRadius.xl,
        padding: theme.spacing.lg,
        maxHeight: '90%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
    },
    title: {
        ...theme.typography.h3,
        color: theme.colors.text.primary,
    },
    form: {
        marginBottom: theme.spacing.xl, // Space for keyboard
    },
    inputGroup: {
        marginBottom: theme.spacing.lg,
    },
    label: {
        ...theme.typography.caption,
        color: theme.colors.text.secondary,
        marginBottom: theme.spacing.xs,
    },
    input: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border.light,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        ...theme.typography.body,
    },
    textArea: {
        height: 100,
    },
    statusContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md,
    },
    statusButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
        borderRadius: theme.borderRadius.md,
        borderWidth: 1,
        borderColor: theme.colors.border.light,
        gap: theme.spacing.sm,
    },
    statusActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    statusText: {
        ...theme.typography.body,
        fontWeight: '500',
    },
});
