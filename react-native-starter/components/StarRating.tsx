import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

interface StarRatingProps {
  rating: number
  maxRating?: number
  size?: number
  color?: string
  emptyColor?: string
  onChange?: (rating: number) => void
  readonly?: boolean
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 24,
  color = '#FFD700',
  emptyColor = '#333',
  onChange,
  readonly = false,
}: StarRatingProps) {
  const handlePress = (index: number, isHalf: boolean) => {
    if (readonly || !onChange) return
    
    const newRating = isHalf ? index + 0.5 : index + 1
    onChange(newRating)
  }

  const renderStar = (index: number) => {
    const filled = rating >= index + 1
    const halfFilled = rating >= index + 0.5 && rating < index + 1

    return (
      <View key={index} style={styles.starContainer}>
        {!readonly && (
          <>
            <TouchableOpacity
              style={[styles.touchArea, { width: size / 2, height: size }]}
              onPress={() => handlePress(index, true)}
              testID={`star-half-${index}`}
            />
            <TouchableOpacity
              style={[styles.touchArea, { width: size / 2, height: size }]}
              onPress={() => handlePress(index, false)}
              testID={`star-full-${index}`}
            />
          </>
        )}
        <View style={styles.iconContainer} pointerEvents="none">
          {halfFilled ? (
            <View style={{ flexDirection: 'row' }}>
              <View style={{ overflow: 'hidden', width: size / 2 }}>
                <Ionicons name="star" size={size} color={color} />
              </View>
              <View style={{ overflow: 'hidden', width: size / 2, marginLeft: -size / 2 }}>
                <Ionicons name="star-outline" size={size} color={emptyColor} />
              </View>
            </View>
          ) : (
            <Ionicons
              name={filled ? 'star' : 'star-outline'}
              size={size}
              color={filled ? color : emptyColor}
            />
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container} testID="star-rating">
      {Array.from({ length: maxRating }, (_, i) => renderStar(i))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  starContainer: {
    position: 'relative',
    flexDirection: 'row',
  },
  touchArea: {
    position: 'absolute',
    zIndex: 1,
  },
  iconContainer: {
    zIndex: 0,
  },
})
