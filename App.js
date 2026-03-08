import React, {
  useState,
  useEffect,
  useMemo,
  useContext,
  createContext
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Remplace par l'adresse IP locale de la machine qui fait tourner l'API
// Exemple: const API_BASE_URL = 'http://192.168.0.15:4000';
const API_BASE_URL = 'http://192.168.0.15:4000';

const TrainingContext = createContext(null);

function TrainingProvider({ children }) {
  const [history, setHistory] = useState([]);

  const addResult = (card, userAnswerLabel, isCorrect) => {
    setHistory((prev) => [
      ...prev,
      {
        card,
        userAnswerLabel,
        isCorrect,
        date: new Date().toISOString()
      }
    ]);
  };

  const mistakes = history.filter((h) => !h.isCorrect);
  const totalPlayed = history.length;
  const totalCorrect = history.filter((h) => h.isCorrect).length;
  const successRate =
    totalPlayed > 0 ? Math.round((totalCorrect / totalPlayed) * 100) : 0;

  const value = useMemo(
    () => ({ history, mistakes, totalPlayed, totalCorrect, successRate, addResult }),
    [history, totalPlayed, totalCorrect, successRate]
  );

  return (
    <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>
  );
}

function useTraining() {
  const ctx = useContext(TrainingContext);
  if (!ctx) {
    throw new Error('useTraining must be used within TrainingProvider');
  }
  return ctx;
}

function TrainingScreen() {
  const { addResult } = useTraining();

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealedHints, setRevealedHints] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [userAnswerLabel, setUserAnswerLabel] = useState(null);
  const [showFront, setShowFront] = useState(true);

  const difficultyLabel = card?.difficulte
    ? card.difficulte.charAt(0).toUpperCase() + card.difficulte.slice(1)
    : '';

  const loadRandomCard = async () => {
    setLoading(true);
    setError('');
    setCard(null);
    setRevealedHints(0);
    setAnswered(false);
    setUserAnswerLabel(null);
    setShowFront(true);

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/random`);
      if (!response.ok) {
        throw new Error('Erreur réseau');
      }
      const data = await response.json();
      setCard(data);
    } catch (e) {
      setError("Impossible de charger une carte. Vérifie que l'API est en ligne.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRandomCard();
  }, []);

  const handleRevealHint = (index) => {
    if (!card) return;
    setRevealedHints((prev) => Math.max(prev, index + 1));
  };

  const handleAnswer = (label) => {
    if (!card || answered) return;

    setUserAnswerLabel(label);

    const correctLabel = card.reponse === 'true_positive' ? 'Vrai positif' : 'Faux positif';
    const isCorrect = label === correctLabel;

    addResult(card, label, isCorrect);
    setAnswered(true);
    setShowFront(false);
  };

  const renderFront = () => {
    if (!card) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{card.titre}</Text>
          <View style={styles.difficultyPill}>
            <Text style={styles.difficultyText}>{difficultyLabel}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Contexte</Text>
          <Text style={styles.sectionText}>{card.contexte}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Commandes</Text>
          <Text style={styles.sectionText}>{card.commandes}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Logs</Text>
          <Text style={styles.sectionText}>{card.logs}</Text>
        </View>

        <View style={styles.hintsContainer}>
          <Text style={styles.sectionLabel}>Indices</Text>
          <View style={styles.hintsButtonsRow}>
            {card.indices?.map((hint, index) => (
              <View key={index} style={styles.hintBlock}>
                <TouchableOpacity
                  style={styles.hintButton}
                  onPress={() => handleRevealHint(index)}
                >
                  <Text style={styles.hintButtonText}>{`Indice ${index + 1}`}</Text>
                </TouchableOpacity>
                {revealedHints > index && (
                  <Text style={styles.hintText}>{hint}</Text>
                )}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.answerRow}>
          <TouchableOpacity
            style={[styles.answerButton, styles.answerButtonPrimary]}
            onPress={() => handleAnswer('Vrai positif')}
          >
            <Text style={styles.answerButtonText}>Vrai positif</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.answerButton, styles.answerButtonSecondary]}
            onPress={() => handleAnswer('Faux positif')}
          >
            <Text style={styles.answerButtonText}>Faux positif</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBack = () => {
    if (!card) return null;

    const correctLabel = card.reponse === 'true_positive' ? 'Vrai positif' : 'Faux positif';
    const isCorrect = userAnswerLabel === correctLabel;

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Résultat</Text>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ta réponse</Text>
          <Text style={styles.sectionText}>{userAnswerLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Réponse correcte</Text>
          <Text style={styles.sectionText}>{correctLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text
            style={[
              styles.resultLabel,
              isCorrect ? styles.resultLabelSuccess : styles.resultLabelError
            ]}
          >
            {isCorrect ? 'Bonne réponse' : 'Mauvaise réponse'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Explication</Text>
          <Text style={styles.sectionText}>{card.explication}</Text>
        </View>

        <View style={styles.answerRow}>
          <TouchableOpacity style={styles.newCardButton} onPress={loadRandomCard}>
            <Text style={styles.newCardButtonText}>Nouvelle carte</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Entraînement</Text>
        <Text style={styles.headerSubtitle}>Réponse à incident</Text>
      </View>

      <View style={styles.content}>
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator color="#e5e7eb" />
            <Text style={styles.loadingText}>Chargement de la carte...</Text>
          </View>
        )}

        {!loading && error !== '' && (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.newCardButton} onPress={loadRandomCard}>
              <Text style={styles.newCardButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && card && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {showFront ? renderFront() : renderBack()}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

function ErrorsScreen() {
  const { mistakes } = useTraining();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Erreurs</Text>
        <Text style={styles.headerSubtitle}>Revoir les cartes ratées</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {mistakes.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.mutedText}>Aucune erreur pour cette session.</Text>
          </View>
        ) : (
          mistakes.map((entry, index) => {
            const { card, userAnswerLabel } = entry;
            const correctLabel =
              card.reponse === 'true_positive' ? 'Vrai positif' : 'Faux positif';

            return (
              <View key={index} style={styles.errorCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{card.titre}</Text>
                  <View style={styles.difficultyPillSmall}>
                    <Text style={styles.difficultyTextSmall}>
                      {card.difficulte.charAt(0).toUpperCase() +
                        card.difficulte.slice(1)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.errorMeta}>
                  Ta réponse : {userAnswerLabel} | Correct : {correctLabel}
                </Text>

                <Text style={styles.sectionText} numberOfLines={3}>
                  {card.contexte}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileScreen() {
  const { totalPlayed, totalCorrect, successRate } = useTraining();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>Statistiques de la session</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Cartes jouées</Text>
          <Text style={styles.profileValue}>{totalPlayed}</Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Bonnes réponses</Text>
          <Text style={styles.profileValue}>{totalCorrect}</Text>
        </View>

        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Taux de réussite</Text>
          <Text style={styles.profileValue}>{successRate}%</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <TrainingProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#020617',
              borderTopColor: '#1f2937'
            },
            tabBarActiveTintColor: '#e5e7eb',
            tabBarInactiveTintColor: '#6b7280'
          }}
        >
          <Tab.Screen name="Entraînement" component={TrainingScreen} />
          <Tab.Screen name="Erreurs" component={ErrorsScreen} />
          <Tab.Screen name="Profil" component={ProfileScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </TrainingProvider>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#020617'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8
  },
  headerTitle: {
    color: '#f9fafb',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4
  },
  content: {
    flex: 1,
    paddingHorizontal: 20
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  loadingText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 13
  },
  errorText: {
    color: '#fca5a5',
    textAlign: 'center',
    marginBottom: 16
  },
  mutedText: {
    color: '#6b7280',
    textAlign: 'center',
    fontSize: 14
  },
  card: {
    backgroundColor: '#020617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  cardTitle: {
    color: '#f9fafb',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12
  },
  difficultyPill: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  difficultyText: {
    color: '#e5e7eb',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  difficultyPillSmall: {
    backgroundColor: '#020617',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1f2937'
  },
  difficultyTextSmall: {
    color: '#e5e7eb',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6
  },
  section: {
    marginTop: 4
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  sectionText: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20
  },
  hintsContainer: {
    marginTop: 8
  },
  hintsButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  hintBlock: {
    flex: 1
  },
  hintButton: {
    backgroundColor: '#020617',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    marginBottom: 4
  },
  hintButtonText: {
    color: '#e5e7eb',
    fontSize: 12
  },
  hintText: {
    color: '#d1d5db',
    fontSize: 12
  },
  answerRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16
  },
  answerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  answerButtonPrimary: {
    backgroundColor: '#22c55e'
  },
  answerButtonSecondary: {
    backgroundColor: '#ef4444'
  },
  answerButtonText: {
    color: '#0b1120',
    fontSize: 14,
    fontWeight: '600'
  },
  newCardButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center'
  },
  newCardButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500'
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: '600'
  },
  resultLabelSuccess: {
    color: '#22c55e'
  },
  resultLabelError: {
    color: '#ef4444'
  },
  errorCard: {
    backgroundColor: '#020617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#111827',
    padding: 16,
    marginBottom: 12
  },
  errorMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginVertical: 4
  },
  profileCard: {
    backgroundColor: '#020617',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#111827',
    padding: 20,
    marginBottom: 12
  },
  profileLabel: {
    color: '#9ca3af',
    fontSize: 13,
    marginBottom: 4
  },
  profileValue: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '600'
  }
});

