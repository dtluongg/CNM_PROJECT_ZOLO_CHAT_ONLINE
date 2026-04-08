import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import friendApi from '../api/friendApi';

const FriendsScreen = () => {
    const [friends, setFriends] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [targetId, setTargetId] = useState('');

    const fetchData = async () => {
        try {
            setLoading(true);
            const friendRes = await friendApi.getFriendList();
            const requestRes = await friendApi.getIncomingRequests();
            
            if (friendRes?.success) setFriends(friendRes.data);
            if (requestRes?.success) setRequests(requestRes.data);
        } catch (error) {
            console.log('Fetch friends error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAccept = async (id) => {
        try {
            await friendApi.acceptRequest(id);
            Alert.alert('Thành công', 'Đã thêm bạn bè');
            fetchData();
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Không thể đồng ý');
        }
    };

    const handleSendRequest = async () => {
        if(!targetId) return Alert.alert('Lỗi', 'Vui lòng nhập ID');
        try {
            await friendApi.sendRequest(targetId);
            Alert.alert('Thành công', 'Đã gửi lời mời thành công!');
            setTargetId('');
        } catch (error) {
            Alert.alert('Lỗi', error.message || 'Gửi thất bại');
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#0066ff" /></View>;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Danh bạ Zolo (Member 1)</Text>
            
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Thêm bạn bằng User ID</Text>
                <View style={styles.row}>
                    <TextInput 
                        style={styles.input}
                        placeholder="Nhập ID User (Test)..."
                        value={targetId}
                        onChangeText={setTargetId}
                    />
                    <TouchableOpacity style={styles.btn} onPress={handleSendRequest}>
                        <Text style={styles.btnText}>Gửi</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Lời mời đến ({requests.length})</Text>
            <FlatList 
                data={requests}
                keyExtractor={item => item._id}
                ListEmptyComponent={<Text style={styles.emptyText}>Trống</Text>}
                renderItem={({item}) => (
                    <View style={styles.item}>
                        <View>
                            <Text style={styles.name}>{item.fromUserId?.displayName || 'Unknown'}</Text>
                            <Text style={styles.subtext}>{item.fromUserId?.email}</Text>
                        </View>
                        <TouchableOpacity style={[styles.btn, {backgroundColor: '#28a745'}]} onPress={() => handleAccept(item._id)}>
                            <Text style={styles.btnText}>Đồng ý</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />

            <Text style={styles.sectionTitle}>Danh sách Bạn bè ({friends.length})</Text>
            <FlatList 
                data={friends}
                keyExtractor={item => item.friendshipId}
                ListEmptyComponent={<Text style={styles.emptyText}>Trống</Text>}
                renderItem={({item}) => (
                    <View style={styles.item}>
                        <View style={styles.avatar}><Text style={styles.avatarText}>{item.displayName ? item.displayName[0].toUpperCase() : '?'}</Text></View>
                        <View style={{flex: 1, marginLeft: 15}}>
                            <Text style={styles.name}>{item.displayName}</Text>
                            <Text style={styles.subtext}>{item.email}</Text>
                        </View>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f0f2f5', paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#1a1a1a' },
    card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginVertical: 15, color: '#444' },
    row: { flexDirection: 'row', gap: 10, marginTop: 10 },
    input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 15, height: 45, backgroundColor: '#fafafa' },
    btn: { backgroundColor: '#0066ff', paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', height: 45 },
    btnText: { color: '#fff', fontWeight: 'bold' },
    item: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5 },
    name: { fontSize: 16, fontWeight: 'bold', color: '#222' },
    subtext: { fontSize: 12, color: '#888', marginTop: 2 },
    emptyText: { color: '#999', fontStyle: 'italic', marginBottom: 10 },
    avatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center'},
    avatarText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 18 }
});

export default FriendsScreen;
