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
  ScrollView,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';
// Web : API sur la meme machine. Expo Go : utilise la meme IP que celle affichee par Expo (ex: exp://192.168.1.110:8081).
const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:4001'
    : 'http://192.168.1.110:4001';
const FETCH_TIMEOUT_MS = 10000;

const TrainingContext = createContext(null);

function TrainingProvider({ children }) {
  const [history, setHistory] = useState([]);
  const { userEmail } = useAuth(); // used to detect login/logout

  // Fetch history when user connects
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/trainings');
        setHistory(response.data);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'historique', error);
      }
    };

    if (userEmail) {
      fetchHistory();
    } else {
      setHistory([]); // clear history on logout
    }
  }, [userEmail]);

  const addResult = async (card, userAnswerLabel, isCorrect) => {
    // 1. Optimistic UI update
    const newResult = {
      card,
      userAnswerLabel,
      isCorrect,
      date: new Date().toISOString()
    };
    
    setHistory((prev) => [...prev, newResult]);

    // 2. Save to backend
    if (userEmail) {
      try {
        await api.post('/trainings', {
          card,
          userAnswerLabel,
          isCorrect
        });
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du résultat', error);
      }
    }
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

import DifficultySelectionScreen from './DifficultySelectionScreen';

function TrainingScreen() {
  const { addResult } = useTraining();

  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revealedHints, setRevealedHints] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [userAnswerLabel, setUserAnswerLabel] = useState(null);
  const [showFront, setShowFront] = useState(true);
  
  // State for difficulty
  const [selectedDifficulty, setSelectedDifficulty] = useState(undefined); // undefined means no choice made yet

  const difficultyLabel = card?.difficulte
    ? card.difficulte.charAt(0).toUpperCase() + card.difficulte.slice(1)
    : '';

  const loadRandomCard = async (difficultyParam = selectedDifficulty) => {
    setLoading(true);
    setError('');
    setCard(null);
    setRevealedHints(0);
    setAnswered(false);
    setUserAnswerLabel(null);
    setShowFront(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      let url = '/alerts/random';
      if (difficultyParam) {
        url += `?difficulte=${difficultyParam}`;
      }

      const response = await api.get(url, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (response.status !== 200) {
        console.log(response);
        throw new Error('Erreur réseau');
      }
      const data = response.data;
      console.log(data);
      setCard(data);
    } catch (e) {
      console.log(e);
      const base =
        e.name === 'AbortError'
          ? "Délai dépassé. Vérifie que l'API tourne sur ton PC (npm run dev dans le back)."
          : "Impossible de charger une carte. Vérifie que l'API est en ligne ou qu'il y a des cartes pour ce niveau.";
      const urlHint =
        Platform.OS !== 'web'
          ? ` API: ${API_BASE_URL} (même IP que Expo).`
          : '';
      setError(base + urlHint);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDifficulty = (diff) => {
    setSelectedDifficulty(diff);
    loadRandomCard(diff);
  };

  const resetDifficulty = () => {
    setSelectedDifficulty(undefined);
    setCard(null);
  };

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
          <TouchableOpacity style={styles.newCardButton} onPress={() => loadRandomCard(selectedDifficulty)}>
            <Text style={styles.newCardButtonText}>Nouvelle carte</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (selectedDifficulty === undefined) {
    return <DifficultySelectionScreen onSelectDifficulty={handleSelectDifficulty} />;
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Entraînement</Text>
          <Text style={styles.headerSubtitle}>
            {selectedDifficulty ? `Niveau : ${selectedDifficulty}` : 'Aléatoire'}
          </Text>
        </View>
        <TouchableOpacity style={styles.changeDiffButton} onPress={resetDifficulty}>
           <Text style={styles.changeDiffButtonText}>Retour</Text>
        </TouchableOpacity>
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
            <TouchableOpacity style={styles.newCardButton} onPress={() => loadRandomCard(selectedDifficulty)}>
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
  const { userEmail, logout } = useAuth();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profil</Text>
        <Text style={styles.headerSubtitle}>Statistiques de la session</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.userSection}>
          <Text style={styles.userEmailText}>{userEmail || 'Utilisateur inconnu'}</Text>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>

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

function HistoryScreen() {
  const { history } = useTraining();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Historique</Text>
        <Text style={styles.headerSubtitle}>Revoir toutes les cartes jouées</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {history.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.mutedText}>Aucune carte jouée pour cette session.</Text>
          </View>
        ) : (
          [...history].reverse().map((entry, index) => {
            const { card, userAnswerLabel, isCorrect } = entry;
            const correctLabel =
              card?.reponse === 'true_positive' ? 'Vrai positif' : 'Faux positif';

            return (
              <View
                key={index}
                style={[
                  styles.errorCard,
                  isCorrect ? { borderColor: '#166534' } : { borderColor: '#991b1b' }
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{card?.titre}</Text>
                  <View style={styles.difficultyPillSmall}>
                    <Text style={styles.difficultyTextSmall}>
                      {card?.difficulte?.charAt(0).toUpperCase() + card?.difficulte?.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={styles.historyStatusRow}>
                  <Text
                    style={[
                      styles.historyStatusText,
                      isCorrect ? { color: '#4ade80' } : { color: '#f87171' }
                    ]}
                  >
                    {isCorrect ? '✅ Bonne réponse' : '❌ Mauvaise réponse'}
                  </Text>
                </View>

                <Text style={styles.errorMeta}>
                  Ta réponse : {userAnswerLabel} | Correct : {correctLabel}
                </Text>

                <Text style={styles.sectionText} numberOfLines={3}>
                  {card?.contexte}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
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
            <Tab.Screen name="Historique" component={HistoryScreen} />
            <Tab.Screen name="Erreurs" component={ErrorsScreen} />
            <Tab.Screen name="Profil" component={ProfileScreen} />
          </Tab.Navigator>
        </NavigationContainer>
      </TrainingProvider>
    </SafeAreaProvider>
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
  headerRow: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTextGroup: {
    flex: 1
  },
  changeDiffButton: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  changeDiffButtonText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500'
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
  },
  userSection: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  userEmailText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500'
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  historyStatusRow: {
    marginBottom: 4
  },
  historyStatusText: {
    fontSize: 13,
    fontWeight: '600'
  }
});