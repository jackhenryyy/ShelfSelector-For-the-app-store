import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions } from 'react-native'
import { Album } from '../lib/types'

interface AlbumCardProps {
  album: Album
  onPress?: () => void
  size?: 'small' | 'medium' | 'large'
  showDetails?: boolean
}

const { width } = Dimensions.get('window')

export function AlbumCard({ 
  album, 
  onPress, 
  size = 'medium',
  showDetails = true 
}: AlbumCardProps) {
  const sizeMap = {
    small: (width - 48) / 4,
    medium: (width - 36) / 3,
    large: width - 32,
  }
  
  const imageSize = sizeMap[size]

  return (
    <TouchableOpacity 
      style={[styles.container, { width: imageSize }]} 
      onPress={onPress}
      activeOpacity={0.7}
      testID={`album-card-${album.id}`}
    >
      <Image
        source={{ uri: album.image_url }}
        style={[styles.image, { width: imageSize, height: imageSize }]}
        testID={`album-image-${album.id}`}
      />
      {showDetails && (
        <View style={styles.details}>
          <Text 
            style={styles.name} 
            numberOfLines={1}
            testID={`album-name-${album.id}`}
          >
            {album.name}
          </Text>
          <Text 
            style={styles.artist} 
            numberOfLines={1}
            testID={`album-artist-${album.id}`}
          >
            {album.artist}
          </Text>
          {album.genre && (
            <Text 
              style={styles.genre} 
              numberOfLines={1}
              testID={`album-genre-${album.id}`}
            >
              {album.genre}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  image: {
    borderRadius: 4,
    backgroundColor: '#1a1a1a',
  },
  details: {
    marginTop: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  artist: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  genre: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
})
