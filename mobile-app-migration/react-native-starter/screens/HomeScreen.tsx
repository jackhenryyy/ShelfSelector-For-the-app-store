import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useQueueAlbums, useNoSkipsAlbums } from '../hooks/useAlbums'
import { Album } from '../lib/types'
import { openInSpotify } from '../lib/spotify'

const { width } = Dimensions.get('window')
const ALBUM_SIZE = width - 64

export function HomeScreen() {
  const [currentAlbum, setCurrentAlbum] = useState<Album | null>(null)
  const [shuffleSource, setShuffleSource] = useState<'queue' | 'noskips'>('queue')
  
  const { queueAlbums, fetchQueueAlbums, getRandomQueueAlbum } = useQueueAlbums()
  const { noSkipsAlbums, fetchNoSkipsAlbums } = useNoSkipsAlbums()

  useEffect(() => {
    fetchQueueAlbums()
    fetchNoSkipsAlbums()
  }, [])

  useEffect(() => {
    handleShuffle()
  }, [queueAlbums, noSkipsAlbums])

  const handleShuffle = () => {
    const source = shuffleSource === 'queue' ? queueAlbums : noSkipsAlbums
    if (source.length === 0) {
      setCurrentAlbum(null)
      return
    }
    
    const randomIndex = Math.floor(Math.random() * source.length)
    const album = source[randomIndex].album
    if (album) {
      setCurrentAlbum(album)
    }
  }

  const handleOpenSpotify = () => {
    if (currentAlbum) {
      openInSpotify(currentAlbum.spotify_id)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>The Shelf</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              shuffleSource === 'queue' && styles.toggleButtonActive,
            ]}
            onPress={() => setShuffleSource('queue')}
            testID="toggle-queue"
          >
            <Text style={[
              styles.toggleText,
              shuffleSource === 'queue' && styles.toggleTextActive,
            ]}>
              Queue
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              shuffleSource === 'noskips' && styles.toggleButtonActive,
            ]}
            onPress={() => setShuffleSource('noskips')}
            testID="toggle-noskips"
          >
            <Text style={[
              styles.toggleText,
              shuffleSource === 'noskips' && styles.toggleTextActive,
            ]}>
              No Skips
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.albumContainer}>
        {currentAlbum ? (
          <>
            <Image
              source={{ uri: currentAlbum.image_url }}
              style={styles.albumImage}
              testID="current-album-image"
            />
            <Text style={styles.albumName} testID="current-album-name">
              {currentAlbum.name}
            </Text>
            <Text style={styles.albumArtist} testID="current-album-artist">
              {currentAlbum.artist}
            </Text>
            {currentAlbum.genre && (
              <Text style={styles.albumGenre} testID="current-album-genre">
                {currentAlbum.genre}
              </Text>
            )}
          </>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={64} color="#333" />
            <Text style={styles.emptyText}>
              Add some albums to your {shuffleSource === 'queue' ? 'Queue' : 'No Skips'} to get started
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.shuffleButton}
          onPress={handleShuffle}
          testID="button-shuffle"
        >
          <Ionicons name="shuffle" size={32} color="#000" />
          <Text style={styles.shuffleText}>Shuffle</Text>
        </TouchableOpacity>
        
        {currentAlbum && (
          <TouchableOpacity
            style={styles.spotifyButton}
            onPress={handleOpenSpotify}
            testID="button-open-spotify"
          >
            <Ionicons name="play" size={24} color="#1DB954" />
            <Text style={styles.spotifyText}>Open in Spotify</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
  },
  toggleText: {
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#000',
  },
  albumContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  albumImage: {
    width: ALBUM_SIZE,
    height: ALBUM_SIZE,
    borderRadius: 8,
    marginBottom: 24,
  },
  albumName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  albumArtist: {
    fontSize: 18,
    color: '#999',
    marginTop: 8,
  },
  albumGenre: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 16,
  },
  shuffleButton: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  shuffleText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
  spotifyButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 30,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  spotifyText: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: '600',
  },
})
