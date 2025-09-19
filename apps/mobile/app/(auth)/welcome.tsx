import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
  StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Carousel, { Pagination } from 'react-native-snap-carousel';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/providers/ThemeProvider';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  gradient: string[];
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Welcome to Wearable Tech Codex',
    subtitle: 'Your Affiliate Marketing Command Center',
    description: 'Manage your wearable tech affiliate sites, track performance, and maximize your revenue with our comprehensive mobile app.',
    image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400',
    gradient: ['#667eea', '#764ba2'],
  },
  {
    id: '2',
    title: 'Real-Time Analytics',
    subtitle: 'Data-Driven Decisions',
    description: 'Monitor your affiliate performance with live analytics, conversion tracking, and revenue insights right from your phone.',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
    gradient: ['#f093fb', '#f5576c'],
  },
  {
    id: '3',
    title: 'Multi-Site Management',
    subtitle: 'Scale Your Empire',
    description: 'Manage multiple affiliate sites, customize themes, and track each site\'s performance from a single dashboard.',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
    gradient: ['#4facfe', '#00f2fe'],
  },
  {
    id: '4',
    title: 'Smart Notifications',
    subtitle: 'Never Miss an Opportunity',
    description: 'Get instant alerts for revenue milestones, traffic spikes, and important affiliate updates to stay ahead of the game.',
    image: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400',
    gradient: ['#43e97b', '#38f9d7'],
  },
];

export default function WelcomeScreen() {
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<Carousel<OnboardingSlide>>(null);
  const { colors } = useTheme();

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <LinearGradient
        colors={item.gradient}
        style={styles.imageContainer}
      >
        <Image source={{ uri: item.image }} style={styles.image} />
      </LinearGradient>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: colors.primary }]}>{item.subtitle}</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      </View>
    </View>
  );

  const handleNext = () => {
    if (activeSlide < ONBOARDING_SLIDES.length - 1) {
      carouselRef.current?.snapToNext();
    } else {
      router.replace('/(auth)/login');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/login');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    slide: {
      flex: 1,
      paddingHorizontal: 20,
    },
    imageContainer: {
      height: screenWidth * 0.8,
      borderRadius: 20,
      overflow: 'hidden',
      marginVertical: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: '80%',
      height: '80%',
      resizeMode: 'contain',
    },
    textContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 12,
    },
    subtitle: {
      fontSize: 18,
      fontWeight: '600',
      textAlign: 'center',
      marginBottom: 16,
    },
    description: {
      fontSize: 16,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 40,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 32,
      paddingBottom: 40,
    },
    skipButton: {
      paddingVertical: 12,
      paddingHorizontal: 24,
    },
    skipText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    nextButton: {
      backgroundColor: colors.primary,
      borderRadius: 25,
      paddingVertical: 14,
      paddingHorizontal: 32,
      minWidth: 100,
      alignItems: 'center',
    },
    nextText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    paginationContainer: {
      paddingVertical: 20,
    },
    dotStyle: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    inactiveDotStyle: {
      backgroundColor: colors.border,
    },
  });

  return (
    <>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.container}>
        <Carousel
          ref={carouselRef}
          data={ONBOARDING_SLIDES}
          renderItem={renderSlide}
          sliderWidth={screenWidth}
          itemWidth={screenWidth}
          onSnapToItem={setActiveSlide}
          enableMomentum={false}
          decelerationRate="fast"
        />
        
        <Pagination
          dotsLength={ONBOARDING_SLIDES.length}
          activeDotIndex={activeSlide}
          containerStyle={styles.paginationContainer}
          dotStyle={styles.dotStyle}
          inactiveDotStyle={styles.inactiveDotStyle}
          inactiveDotOpacity={0.4}
          inactiveDotScale={0.6}
        />

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextText}>
              {activeSlide === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}