import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@remotedays/shared';
import { useRequests } from '../../hooks';
import { theme } from '../../constants/theme';
import { Header, LoadingSpinner, Card, EmptyState, StatusBadge, CreateRequestModal } from '../../components';
import { Request } from '../../services/api';

export default function RequestsScreen() {
    const { data: requests, isLoading, refetch, isRefetching } = useRequests();
    const [modalVisible, setModalVisible] = useState(false);

    if (isLoading) {
        return <LoadingSpinner fullScreen />;
    }

    return (
        <View style={styles.container}>
            <Header
                title="My Requests"
                subtitle="Manage your modification requests"
                icon="git-pull-request-outline"
                rightContent={
                    <TouchableOpacity onPress={() => setModalVisible(true)}>
                        <Ionicons name="add-circle-outline" size={32} color="#fff" />
                    </TouchableOpacity>
                }
            />

            <FlatList<Request>
                data={requests}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
                }
                renderItem={({ item }) => (
                    <Card style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text style={styles.date}>{formatDate(item.date)}</Text>
                                <Text style={styles.statusLabel}>
                                    Requested: <Text style={styles.statusValue}>{item.requestedStatus === 'home' ? 'Home' : 'Office'}</Text>
                                </Text>
                            </View>
                            <StatusBadge status={item.status} />
                        </View>
                        <View style={styles.divider} />
                        <Text style={styles.reasonLabel}>Reason:</Text>
                        <Text style={styles.reason}>{item.reason}</Text>
                        {item.adminNote && (
                            <View style={styles.adminNote}>
                                <Text style={styles.adminNoteLabel}>Note:</Text>
                                <Text style={styles.adminNoteText}>{item.adminNote}</Text>
                            </View>
                        )}
                    </Card>
                )}
                ListEmptyComponent={
                    <EmptyState
                        icon="document-text-outline"
                        title="No Requests"
                        message="You haven't made any modification requests yet."
                    />
                }
            />

            <CreateRequestModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    list: {
        padding: theme.spacing.lg,
    },
    card: {
        marginBottom: theme.spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    date: {
        ...theme.typography.h3,
        color: theme.colors.text.primary,
    },
    statusLabel: {
        ...theme.typography.caption,
        color: theme.colors.text.secondary,
    },
    statusValue: {
        fontWeight: '600',
        color: theme.colors.text.primary,
        textTransform: 'capitalize',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border.light,
        marginVertical: theme.spacing.sm,
    },
    reasonLabel: {
        ...theme.typography.caption,
        color: theme.colors.text.secondary,
        marginBottom: 4,
    },
    reason: {
        ...theme.typography.body,
        color: theme.colors.text.primary,
    },
    adminNote: {
        marginTop: theme.spacing.sm,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
    },
    adminNoteLabel: {
        ...theme.typography.caption,
        fontWeight: 'bold',
        color: theme.colors.text.secondary,
    },
    adminNoteText: {
        ...theme.typography.caption,
        color: theme.colors.text.primary,
    },
});
