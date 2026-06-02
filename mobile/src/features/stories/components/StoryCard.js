import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLanguage } from '../../../context/LanguageContext';

const { width } = Dimensions.get('window');
const cardWidth = (width - 32) / 2;

export default function StoryCard({ user, stories, isMe, onPress, onAdd, THEME }) {
    const { t } = useLanguage();
    const latestStory = stories && stories.length > 0 ? stories[stories.length - 1] : null;

    const handlePress = () => {
        if (isMe && !latestStory) {
            console.log('[StoryCard] Empty me card pressed -> onAdd');
            onAdd();
        } else {
            console.log('[StoryCard] Card pressed -> onPress');
            onPress();
        }
    };

    return (
        <TouchableOpacity 
            style={[styles.card, { backgroundColor: THEME.bgSecondary }]}
            onPress={handlePress}
            activeOpacity={0.8}
        >
            {latestStory ? (
                <Image 
                    source={{ uri: latestStory.mediaUrl }} 
                    style={styles.media}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.emptyMedia, { backgroundColor: THEME.bgTertiary }]}>
                    {!isMe && <Feather name="user" size={32} color={THEME.textSecondary} />}
                </View>
            )}

            <View style={styles.overlay}>
                <View style={[styles.avatarContainer, { borderColor: THEME.accent }]}>
                    <Image 
                        source={{ uri: user.avatar || 'https://via.placeholder.com/150' }} 
                        style={styles.avatar} 
                    />
                </View>
                <Text style={styles.name} numberOfLines={1}>
                    {isMe ? t('stories.my_story') : user.displayName}
                </Text>
            </View>

            {isMe && (
                <TouchableOpacity 
                    style={[styles.addButton, { backgroundColor: THEME.accent, zIndex: 999 }]}
                    onPress={() => {
                        console.log('[StoryCard] Plus icon pressed -> onAdd');
                        onAdd();
                    }}
                    hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                    <Feather name="plus" size={16} color="#fff" />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        width: cardWidth,
        height: cardWidth * 1.6,
        margin: 4,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative'
    },
    media: { width: '100%', height: '100%' },
    emptyMedia: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
    overlay: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        padding: 8,
        height: '40%',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.1)'
    },
    avatarContainer: {
        width: 36, height: 36,
        borderRadius: 18,
        borderWidth: 2,
        marginBottom: 4,
        overflow: 'hidden'
    },
    avatar: { width: '100%', height: '100%' },
    name: { color: '#fff', fontSize: 13, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
    addButton: {
        position: 'absolute',
        top: 24, left: 16,
        width: 24, height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff'
    }
});
