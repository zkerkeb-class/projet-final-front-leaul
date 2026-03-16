import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';

const DifficultySelectionScreen = ({ onSelectDifficulty }) => {
  const difficulties = [
    { label: 'Facile', value: 'facile', color: '#22c55e' },
    { label: 'Moyen', value: 'moyen', color: '#eab308' },
    { label: 'Difficile', value: 'difficile', color: '#ef4444' },
    { label: 'Aléatoire', value: null, color: '#3b82f6' }
  ];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CYBER SOC</Text>
        <Text style={styles.headerSubtitle}>Choisissez la difficulté des alertes</Text>
      </View>

      <View style={styles.content}>
        {difficulties.map((diff, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.button, { borderColor: diff.color }]}
            onPress={() => onSelectDifficulty(diff.value)}
          >
            <Text style={[styles.buttonText, { color: diff.color }]}>
              {diff.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020617',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  button: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default DifficultySelectionScreen;
