import React, { useEffect, useState } from 'react';
import { 
    StyleSheet, Text, View, Image, ScrollView, 
    TouchableOpacity, ActivityIndicator, Alert, TextInput, FlatList 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getPetImageUrl, API_ROOT } from '../services/api';
import { getAllPets, uploadPetImage, createPetPost, getPetPosts, togglePostLike } from '../services/petApi';
import { useAuth } from '../context/AuthContext';

const COLORS = {
    bg: '#f6f1e8',
    card: '#FFFFFF',
    primary: '#a75c43',
    primaryLight: '#F2E8E3',
    accent: '#3D6B5E',
    accentLight: '#E2EDE9',
    dark: '#1f2937',
    mid: '#6b7280',
    danger: '#EF4444',
    dangerLight: '#FEE2E2',
    line: '#EAE2D8',
};

function resolveVaccinationStatus(pet) {
    const raw = pet?.vaccinated ?? pet?.isVaccinated ?? pet?.vaccinationStatus;

    if (raw === true || raw === 'true' || raw === 'Vaccinated' || raw === 'VACCINATED' || raw === 'yes') {
        return { label: 'Vaccinated', ok: true, known: true };
    }
    if (raw === false || raw === 'false' || raw === 'Not Vaccinated' || raw === 'NOT_VACCINATED' || raw === 'no') {
        return { label: 'Not Vaccinated', ok: false, known: true };
    }
    return { label: 'Unknown', ok: null, known: false };
}

export default function PetProfile({ route, navigation, selectedMyPet: propsPet }) {
    const params = route?.params;
    const initialPet =
        propsPet ||
        params?.selectedMyPet ||
        params?.pet ||
        params?.selectedPet ||
        params?.item ||
        (params?.id ? params : null);

    const [pet, setPet] = useState(initialPet || null);
    const [loading, setLoading] = useState(!initialPet);
    const [imageFailed, setImageFailed] = useState(false);

    // 📸 Social Media Feed State Variables
    const [posts, setPosts] = useState([]);
    const [caption, setCaption] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
    const [profileImageVersion, setProfileImageVersion] = useState(0);
    const { user } = useAuth();
    useEffect(() => {
        if (initialPet?.name || !initialPet?.id) {
            setPet(initialPet || null);
            setLoading(false);
            return;
        }

        let active = true;
        (async () => {
            setLoading(true);
            const all = await getAllPets();
            if (!active) return;
            const found = Array.isArray(all) ? all.find((p) => p?.id === initialPet.id) : null;
            setPet(found || initialPet);
                // load posts for the pet we found
                const pid = (found || initialPet)?.id;
                if (pid) {
                    const fetched = await getPetPosts(pid, user?.email);
                    const mapped = Array.isArray(fetched) ? fetched.map((x) => ({
                        ...x,
                        imageUrl: x.imageUrl && x.imageUrl.startsWith('/') ? `${API_ROOT}${x.imageUrl}` : x.imageUrl,
                        liked: x.liked ?? x.isLiked ?? false,
                        likes: x.likes ?? x.likeCount ?? 0,
                    })) : [];
                    setPosts(mapped);
                }
            setLoading(false);
        })();

        return () => { active = false; };
    }, [initialPet?.id]);

    // Load posts whenever `pet` is available/changed
    useEffect(() => {
        let active = true;
        (async () => {
            if (!pet?.id) return;
            const fetched = await getPetPosts(pet.id, user?.email);
            if (!active) return;
            const mapped = Array.isArray(fetched) ? fetched.map((x) => ({
                ...x,
                imageUrl: x.imageUrl && x.imageUrl.startsWith('/') ? `${API_ROOT}${x.imageUrl}` : x.imageUrl,
                liked: x.liked ?? x.isLiked ?? false,
                likes: x.likes ?? x.likeCount ?? 0,
            })) : [];
            setPosts(mapped);
        })();

        return () => { active = false; };
    }, [pet?.id]);

    // 🖼️ Gallery එකෙන් Image එකක් Select කරගැනීමට
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Gallery access is needed to upload photos!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    // 📸 Profile image picker + upload
    const pickProfileImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permissionResult.granted) {
            Alert.alert('Permission Required', 'Gallery access is needed to upload photos!');
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled) return;

        const uri = result.assets[0].uri;

        if (!pet?.id) {
            Alert.alert('Missing Pet', 'Pet must be created before uploading a profile photo.');
            return;
        }

        try {
            setUploadingProfileImage(true);
            const updated = await uploadPetImage(pet.id, uri);
            if (updated) {
                setPet(updated);
                setImageFailed(false);
                setProfileImageVersion((v) => v + 1);
                Alert.alert('Success', 'Profile image updated');
            }
        } catch (err) {
            console.log('Profile upload failed', err.response?.data || err.message);
            Alert.alert('Upload Failed', err.response?.data || 'Could not upload image');
        } finally {
            setUploadingProfileImage(false);
        }
    };

    // 🚀 Post එක Feed එකට එකතු කිරීම
    const handleAddPost = async () => {
        if (!selectedImage) {
            Alert.alert('No Image', 'Please select an image first!');
            return;
        }

        if (!pet?.id) {
            Alert.alert('Missing Pet', 'Create the pet before posting.');
            return;
        }

        try {
            const saved = await createPetPost(pet.id, selectedImage, caption.trim());
            // map image url to full URL
            const mapped = saved.imageUrl && saved.imageUrl.startsWith('/') ? { ...saved, imageUrl: `${API_ROOT}${saved.imageUrl}` } : saved;
            const normalized = { ...mapped, liked: false, likes: mapped.likes ?? 0 };
            setPosts((prev) => [normalized, ...prev]);
            setSelectedImage(null);
            setCaption('');
        } catch (err) {
            console.log('Create post failed', err.response?.data || err.message);
            Alert.alert('Post Failed', err.response?.data || 'Could not create post');
        }
    };

    // ❤️ Like Button එක Handle කිරීමට
    const handleToggleLike = async (postId) => {
        if (!user?.email) {
            Alert.alert('Login required', 'Please login to like posts');
            return;
        }

        try {
            const resp = await togglePostLike(postId, user.email);
            setPosts((prev) => prev.map((p) => {
                if (p.id === postId) {
                    return { ...p, liked: resp.liked, likes: resp.likes };
                }
                return p;
            }));
        } catch (err) {
            console.log('Like toggle failed', err.response?.data || err.message);
            Alert.alert('Error', 'Could not update like');
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!pet) {
        return (
            <View style={styles.centered}>
                <Text style={styles.emptyText}>No Pet Profile Selected 🐾</Text>
            </View>
        );
    }

    const vaccination = resolveVaccinationStatus(pet);
    const imageUrl = pet.id ? `${getPetImageUrl(pet.id)}?v=${profileImageVersion}` : null;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header / Back Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color={COLORS.dark} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pet Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Profile Image */}
            <View style={styles.imageContainer}>
                {imageUrl && !imageFailed ? (
                    <Image
                        source={{ uri: imageUrl }}
                        style={styles.petImage}
                        onError={() => setImageFailed(true)}
                    />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={{ fontSize: 64 }}>🐾</Text>
                    </View>
                )}

                {/* Camera button to change profile image */}
                <TouchableOpacity
                    style={styles.changePhotoBtn}
                    onPress={pickProfileImage}
                    disabled={uploadingProfileImage}
                >
                    {uploadingProfileImage ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <MaterialIcons name="camera-alt" size={18} color="#fff" />
                    )}
                </TouchableOpacity>

                <View
                    style={[
                        styles.vaccineBadge,
                        vaccination.ok === true && styles.vaccineBadgeOk,
                        vaccination.ok === false && styles.vaccineBadgeBad,
                    ]}
                >
                    <MaterialIcons
                        name={vaccination.ok === true ? 'verified' : vaccination.ok === false ? 'error-outline' : 'help-outline'}
                        size={13}
                        color="#fff"
                    />
                    <Text style={styles.vaccineBadgeText}>{vaccination.label}</Text>
                </View>
            </View>

            {/* Pet Info Card */}
            <View style={styles.infoCard}>
                <Text style={styles.petName}>{pet.name || 'N/A'}</Text>
                <Text style={styles.petBreed}>{pet.breed || 'Unknown Breed'}</Text>

                <View style={styles.divider} />

                {/* Details Grid */}
                <View style={styles.grid}>
                    <InfoTile icon="pets" label="Type" value={pet.type || 'N/A'} />
                    <InfoTile icon="cake" label="Age" value={pet.age ? `${pet.age} Years` : 'N/A'} />
                    <InfoTile icon="wc" label="Gender" value={pet.gender || 'N/A'} />
                    <InfoTile icon="person" label="Owner" value={pet.user?.name || pet.user?.email || 'N/A'} />
                    <InfoTile
                        icon={vaccination.ok === true ? 'verified' : vaccination.ok === false ? 'error-outline' : 'help-outline'}
                        label="Vaccination"
                        value={vaccination.label}
                        valueColor={vaccination.ok === true ? COLORS.accent : vaccination.ok === false ? COLORS.danger : COLORS.mid}
                    />
                </View>
            </View>

            {/* 📸 ADD NEW POST SECTION */}
            <View style={styles.createPostCard}>
                <Text style={styles.sectionTitle}>Share a Moment 🐾</Text>

                {selectedImage ? (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: selectedImage }} style={styles.previewImage} />
                        <TouchableOpacity style={styles.removeImageBtn} onPress={() => setSelectedImage(null)}>
                            <MaterialIcons name="close" size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity style={styles.pickImageBtn} onPress={pickImage}>
                        <MaterialIcons name="add-a-photo" size={28} color={COLORS.primary} />
                        <Text style={styles.pickImageText}>Select Photo from Gallery</Text>
                    </TouchableOpacity>
                )}

                <TextInput
                    style={styles.captionInput}
                    placeholder="Write a caption..."
                    placeholderTextColor={COLORS.mid}
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                />

                <TouchableOpacity style={styles.postBtn} onPress={handleAddPost}>
                    <MaterialIcons name="send" size={18} color="#fff" />
                    <Text style={styles.postBtnText}>Post Moment</Text>
                </TouchableOpacity>
            </View>

            {/* 📰 FEED / POSTS LIST SECTION */}
            <View style={styles.feedSection}>
                <Text style={styles.sectionTitle}>Photos & Posts ({posts.length})</Text>

                {posts.length === 0 ? (
                    <View style={styles.emptyFeed}>
                        <MaterialIcons name="photo-library" size={48} color={COLORS.mid} />
                        <Text style={styles.emptyFeedText}>No posts yet. Share your first moment!</Text>
                    </View>
                ) : (
                    posts.map((item) => (
                        <View key={item.id} style={styles.postCard}>
                            {/* Post Header */}
                            <View style={styles.postHeader}>
                                {imageUrl && !imageFailed ? (
                                    <Image source={{ uri: imageUrl }} style={styles.postAvatar} />
                                ) : (
                                    <View style={[styles.postAvatar, { backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ fontSize: 16 }}>🐾</Text>
                                    </View>
                                )}
                                <View style={styles.postHeaderInfo}>
                                    <Text style={styles.postAuthor}>{pet.name}</Text>
                                    <Text style={styles.postTime}>{item.createdAt}</Text>
                                </View>
                            </View>

                            {/* Post Image */}
                            <Image source={{ uri: item.imageUrl }} style={styles.postImage} />

                            {/* Actions (Like Button) */}
                            <View style={styles.postActions}>
                                <TouchableOpacity style={styles.likeBtn} onPress={() => handleToggleLike(item.id)}>
                                    <MaterialIcons
                                        name={item.liked ? 'favorite' : 'favorite-border'}
                                        size={24}
                                        color={item.liked ? COLORS.danger : COLORS.dark}
                                    />
                                    <Text style={styles.likeCount}>{item.likes}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Caption */}
                            {item.caption ? (
                                <View style={styles.captionContainer}>
                                    <Text style={styles.captionAuthor}>{pet.name}</Text>
                                    <Text style={styles.captionText}>{item.caption}</Text>
                                </View>
                            ) : null}
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

function InfoTile({ icon, label, value, valueColor }) {
    return (
        <View style={styles.tile}>
            <View style={styles.iconBox}>
                <MaterialIcons name={icon} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.tileContent}>
                <Text style={styles.tileLabel}>{label}</Text>
                <Text style={[styles.tileValue, valueColor && { color: valueColor }]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: 50, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.dark },

    imageContainer: { alignItems: 'center', marginVertical: 20, position: 'relative' },
    petImage: {
        width: 150, height: 150, borderRadius: 75,
        borderWidth: 4, borderColor: COLORS.card,
        elevation: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
    },
    avatarPlaceholder: {
        width: 150, height: 150, borderRadius: 75,
        backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
        borderWidth: 4, borderColor: COLORS.card,
    },

    vaccineBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        position: 'absolute', bottom: 14, alignSelf: 'center',
        backgroundColor: COLORS.mid, borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 5,
        borderWidth: 2, borderColor: COLORS.bg,
    },
    vaccineBadgeOk: { backgroundColor: COLORS.accent },
    vaccineBadgeBad: { backgroundColor: COLORS.danger },
    vaccineBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    infoCard: {
        backgroundColor: COLORS.card, marginHorizontal: 20, borderRadius: 20, padding: 20,
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 20,
    },
    petName: { fontSize: 26, fontWeight: '800', color: COLORS.dark, textAlign: 'center' },
    petBreed: { fontSize: 14, fontWeight: '500', color: COLORS.primary, textAlign: 'center', marginTop: 4 },
    divider: { height: 1, backgroundColor: COLORS.line, marginVertical: 20 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    tile: { flexDirection: 'row', width: '48%', marginBottom: 16, alignItems: 'center', gap: 10 },
    iconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center' },
    tileContent: { flex: 1 },
    tileLabel: { fontSize: 11, color: COLORS.mid, fontWeight: '500' },
    tileValue: { fontSize: 14, color: COLORS.dark, fontWeight: '600', marginTop: 1 },

    emptyText: { fontSize: 16, color: COLORS.mid, fontWeight: '500' },

    /* 📸 Add Post Box Styles */
    createPostCard: {
        backgroundColor: COLORS.card, marginHorizontal: 20, borderRadius: 20, padding: 16,
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 20,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginBottom: 12 },
    pickImageBtn: {
        height: 120, borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
        borderRadius: 14, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryLight,
        marginBottom: 12, gap: 6,
    },
    pickImageText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
    previewContainer: { position: 'relative', marginBottom: 12 },
    previewImage: { width: '100%', height: 200, borderRadius: 14 },
    removeImageBtn: {
        position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 6, borderRadius: 20,
    },
    captionInput: {
        backgroundColor: COLORS.bg, borderRadius: 12, padding: 12, fontSize: 14,
        color: COLORS.dark, minHeight: 60, textAlignVertical: 'top', marginBottom: 12,
    },
    postBtn: {
        backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12,
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8,
    },
    postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    /* 📰 Feed / Posts List Styles */
    feedSection: { marginHorizontal: 20, marginBottom: 40 },
    emptyFeed: { alignItems: 'center', paddingVertical: 30, gap: 10 },
    emptyFeedText: { color: COLORS.mid, fontSize: 14 },
    postCard: {
        backgroundColor: COLORS.card, borderRadius: 20, overflow: 'hidden', marginBottom: 20,
        elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8,
    },
    changePhotoBtn: {
        position: 'absolute', right: 8, bottom: 8,
        width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center', elevation: 4,
    },
    postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
    postAvatar: { width: 38, height: 38, borderRadius: 19 },
    postHeaderInfo: { flex: 1 },
    postAuthor: { fontWeight: '700', fontSize: 14, color: COLORS.dark },
    postTime: { fontSize: 11, color: COLORS.mid },
    postImage: { width: '100%', height: 280, resizeMode: 'cover' },
    postActions: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8 },
    likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    likeCount: { fontWeight: '600', fontSize: 14, color: COLORS.dark },
    captionContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 14, gap: 6 },
    captionAuthor: { fontWeight: '700', fontSize: 13, color: COLORS.dark },
    captionText: { fontSize: 13, color: COLORS.dark, flex: 1 },
});