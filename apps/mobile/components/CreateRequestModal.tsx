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
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { formatDate } from '@remotedays/shared';
import { useCreateRequest } from '../hooks';
import { theme } from '../constants/theme';
import { GradientButton } from './GradientButton';
import { LocationType } from '@remotedays/types';

interface CreateRequestModalProps {
    visible: boolean;
    onClose: () => void;
}

export function CreateRequestModal({ visible, onClose }: CreateRequestModalProps) {
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [status, setStatus] = useState<LocationType>('home');
    const [reason, setReason] = useState('');

    const createMutation = useCreateRequest();

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        // On Android, the picker closes automatically
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const handleSubmit = () => {
        if (!reason.trim()) {
            Alert.alert('Required', 'Please provide a reason for this request.');
            return;
        }

        // Format date as YYYY-MM-DD for API
        const formattedDate = date.toISOString().split('T')[0];

        createMutation.mutate(
            { date: formattedDate, status, reason },
            {
                onSuccess: () => {
                    Alert.alert('Success', 'Request submitted successfully.');
                    setReason('');
                    setDate(new Date());
                    onClose();
                },
                onError: (error: unknown) => {
                    const message = error instanceof Error ? error.message : 'Failed to submit request.';
                    Alert.alert('Error', message);
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
                        {/* Date Picker */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date</Text>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Ionicons name="calendar" size={20} color={theme.colors.primary} />
                                <Text style={styles.dateText}>{formatDate(date)}</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <View style={styles.datePickerContainer}>
                                    <DateTimePicker
                                        value={date}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={handleDateChange}
                                        maximumDate={new Date()} // Can't request for future dates
                                    />
                                    {Platform.OS === 'ios' && (
                                        <TouchableOpacity
                                            style={styles.datePickerDone}
                                            onPress={() => setShowDatePicker(false)}
                                        >
                                            <Text style={styles.datePickerDoneText}>Done</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}
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
        color: theme.colors.text.primary,
    },
    textArea: {
        height: 100,
    },
    dateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.border.light,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
    },
    dateText: {
        ...theme.typography.body,
        color: theme.colors.text.primary,
    },
    datePickerContainer: {
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        overflow: 'hidden',
    },
    datePickerDone: {
        alignItems: 'center',
        padding: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border.light,
    },
    datePickerDoneText: {
        ...theme.typography.body,
        color: theme.colors.primary,
        fontWeight: '600',
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
