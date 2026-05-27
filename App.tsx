import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

type ScenarioId = "freeTalk" | "meeting" | "presentation" | "interview" | "travel";
type Step = "home" | "speaking" | "feedback" | "review" | "mockSetup" | "mockPractice";
type MockScenarioId = "jobInterview" | "presentation" | "meeting" | "networking" | "conferenceQa";

type MistakeItem = {
  id: string;
  pattern: string;
  label: string;
  original: string;
  improved: string;
  reminder: string;
  examples: string[];
  color: string;
  backgroundColor: string;
};

type Feedback = {
  original: string;
  improved: string;
  reason: string;
  alternatives: string[];
};

const scenarioCoachingGoals: Record<ScenarioId, string> = {
  freeTalk: "누구와 대화해도 자연스럽고 유창하게 말하기",
  meeting: "비즈니스 영어로 설득력을 높이기",
  presentation: "구조화와 전달력을 높이기",
  interview: "논리, STAR 구조, 자신감을 살리기",
  travel: "생존형 표현과 즉답성을 높이기"
};

const patternReminders: MistakeItem[] = [
  {
    id: "explain-about",
    pattern: "explain about",
    label: "한국어식 구조",
    original: "explain about",
    improved: "explain something / walk someone through something",
    reminder: "발표나 설명에서는 about을 붙이기보다 explain the topic 또는 walk you through로 말해보세요.",
    examples: [
      "정보를 짧게 설명할 때: Let me explain the timeline.",
      "발표에서 순서대로 안내할 때: I'll walk you through the main idea.",
      "핵심만 짚을 때: Let me highlight the key point."
    ],
    color: "#0F766E",
    backgroundColor: "#F8FAFC"
  },
  {
    id: "discuss-about",
    pattern: "discuss about",
    label: "전치사 습관",
    original: "discuss about",
    improved: "discuss / revisit / align on",
    reminder: "회의에서는 목적에 따라 표현을 나눠 쓰면 좋아요.",
    examples: [
      "처음 논의할 때: Let's discuss the launch plan.",
      "다시 검토할 때: We should revisit the budget issue.",
      "의견을 맞출 때: Let's align on the next steps."
    ],
    color: "#0F766E",
    backgroundColor: "#F8FAFC"
  },
  {
    id: "how-can-i-go",
    pattern: "how can i go",
    label: "여행 표현",
    original: "How can I go?",
    improved: "How can I get there?",
    reminder: "길을 물을 땐 go보다 get there가 자연스럽고 바로 이해돼요.",
    examples: [
      "길을 물을 때: How can I get there?",
      "정중하게 물을 때: Could you tell me how to get there?",
      "교통수단을 물을 때: Which train should I take?"
    ],
    color: "#0F766E",
    backgroundColor: "#F8FAFC"
  },
  {
    id: "i-want-to",
    pattern: "i want to",
    label: "톤 조절",
    original: "I want to",
    improved: "I'd like to",
    reminder: "회의, 발표, 면접에서는 I'd like to로 시작하면 더 부드럽고 professional하게 들려요.",
    examples: [
      "회의에서 의견을 낼 때: I'd like to add one point.",
      "발표를 시작할 때: I'd like to walk you through the agenda.",
      "면접에서 경험을 말할 때: I'd like to share one example."
    ],
    color: "#0F766E",
    backgroundColor: "#F8FAFC"
  }
];

const mockScenarios: Array<{
  id: MockScenarioId;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "jobInterview",
    label: "Job Interview",
    description: "경험, 강점, 후속질문 대응",
    icon: "briefcase-outline"
  },
  {
    id: "presentation",
    label: "Presentation",
    description: "도입, 핵심 설명, 질의 대응",
    icon: "podium-outline"
  },
  {
    id: "meeting",
    label: "Meeting",
    description: "의견 제시, 조율, 반박 대응",
    icon: "people-outline"
  },
  {
    id: "networking",
    label: "Networking",
    description: "스몰토크와 관계 형성",
    icon: "chatbubbles-outline"
  },
  {
    id: "conferenceQa",
    label: "Conference Q&A",
    description: "날카로운 질문과 재질문 대응",
    icon: "help-circle-outline"
  }
];

const mockDurations = [3, 5, 10, 15];

const mockChallengeTypes = [
  {
    label: "꼬리 질문",
    color: "#0F766E",
    backgroundColor: "#DDF7EF"
  },
  {
    label: "예상 밖 질문",
    color: "#B45309",
    backgroundColor: "#FEF3C7"
  },
  {
    label: "구체화 요청",
    color: "#BE123C",
    backgroundColor: "#FFE4E6"
  },
  {
    label: "재질문",
    color: "#6D28D9",
    backgroundColor: "#F3E8FF"
  }
];

type SpeechRecognitionAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = {
  0: SpeechRecognitionAlternative;
  isFinal: boolean;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEventLike = {
  results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEventLike = {
  error?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const scenarios: Array<{
  id: ScenarioId;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    id: "freeTalk",
    label: "프리토킹",
    description: "친구, 동료, 고객과 자연스럽고 유창하게",
    icon: "chatbubbles-outline"
  },
  {
    id: "meeting",
    label: "회의",
    description: "Business English로 설득력 있게",
    icon: "people-outline"
  },
  {
    id: "presentation",
    label: "발표",
    description: "구조화와 전달력을 또렷하게",
    icon: "podium-outline"
  },
  {
    id: "interview",
    label: "면접",
    description: "논리, STAR, 자신감을 함께",
    icon: "briefcase-outline"
  },
  {
    id: "travel",
    label: "여행",
    description: "생존형 표현으로 바로 답하기",
    icon: "airplane-outline"
  }
];

const defaultFeedbackByScenario: Record<ScenarioId, Feedback> = {
  freeTalk: {
    original: "I want to talk about my day.",
    improved: "I'd like to talk about how my day went.",
    reason:
      "프리토킹에서는 문법보다 대화가 끊기지 않는 자연스러움과 유창성이 중요해요. I'd like to talk about how my day went처럼 말하면 친구, 직장동료, 고객과의 대화에서도 부드럽게 말문을 열 수 있습니다.",
    alternatives: [
      "Let me tell you about my day.",
      "Something interesting happened today.",
      "I wanted to share a small story from today."
    ]
  },
  meeting: {
    original: "I think we need to discuss about this problem again.",
    improved: "I think we should revisit this issue together.",
    reason:
      "회의에서는 맞는 문장보다 설득력 있는 표현이 중요해요. discuss about은 about을 빼고, problem보다 issue를 쓰면 덜 공격적으로 들립니다. revisit은 다시 검토하자는 비즈니스 영어 톤을 만들어줍니다.",
    alternatives: [
      "It might be worth revisiting this issue.",
      "Maybe we could take another look at this.",
      "I'd like to align on this point before we move on."
    ]
  },
  presentation: {
    original: "Today I will explain about our new project.",
    improved: "Today, I'll walk you through our new project.",
    reason:
      "발표에서는 문장을 고치는 것보다 청중이 따라오기 쉬운 구조와 전달력이 중요해요. walk you through는 내용을 순서대로 안내한다는 느낌을 주기 때문에 발표 도입에 잘 맞습니다.",
    alternatives: [
      "Let me give you a quick overview of our new project.",
      "I'd like to highlight the key points of our new project.",
      "Today, I'll share what we're building and why it matters."
    ]
  },
  interview: {
    original: "I experienced many projects in my university.",
    improved: "I worked on several projects during university.",
    reason:
      "면접에서는 논리, STAR 구조, 자신감이 핵심이에요. experienced보다 worked on이 실제 행동을 보여주고, several projects처럼 구체적으로 말하면 Situation과 Action이 더 선명해집니다.",
    alternatives: [
      "I was involved in several team projects during university.",
      "One project that best shows my strengths is...",
      "Through those projects, I learned how to communicate under pressure."
    ]
  },
  travel: {
    original: "I want to go this place. How can I go?",
    improved: "I'd like to go to this place. How can I get there?",
    reason:
      "여행에서는 완벽한 문장보다 바로 통하는 생존형 표현과 즉답성이 중요해요. 길을 물을 때는 How can I go?보다 How can I get there?가 짧고 자연스럽게 전달됩니다.",
    alternatives: [
      "Could you tell me how to get there?",
      "Is this place within walking distance?",
      "Which train should I take to get there?"
    ]
  }
};

export default function App() {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const latestTranscriptRef = useRef("");
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioId>("freeTalk");
  const [step, setStep] = useState<Step>("home");
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [feedbackInputText, setFeedbackInputText] = useState("");
  const [aiFeedback, setAiFeedback] = useState<Feedback | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [speechError, setSpeechError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(false);
  const [mistakeLog, setMistakeLog] = useState<MistakeItem[]>(patternReminders);
  const [selectedMockScenario, setSelectedMockScenario] =
    useState<MockScenarioId>("jobInterview");
  const [mockDuration, setMockDuration] = useState(5);
  const [mockFollowUpIndex, setMockFollowUpIndex] = useState(0);
  const [mockFollowUpsStarted, setMockFollowUpsStarted] = useState(false);

  const scenario = useMemo(
    () => scenarios.find((item) => item.id === selectedScenario) ?? scenarios[1],
    [selectedScenario]
  );
  const spokenText = recognizedText.trim();
  const feedbackSourceText = feedbackInputText.trim();
  const demoFeedback = useMemo(
    () => buildDemoFeedback(feedbackSourceText, selectedScenario),
    [feedbackSourceText, selectedScenario]
  );
  const feedback = aiFeedback ?? demoFeedback;
  const activeReminder = useMemo(
    () => findActiveReminder(spokenText, mistakeLog),
    [mistakeLog, spokenText]
  );
  const selectedMock =
    mockScenarios.find((item) => item.id === selectedMockScenario) ??
    mockScenarios[0];
  const currentMockChallenge =
    mockChallengeTypes[mockFollowUpIndex % mockChallengeTypes.length];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    setSpeechSupported(Boolean(Recognition));

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";

      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }

      const nextTranscript = transcript.trim();
      latestTranscriptRef.current = nextTranscript;
      setRecognizedText(nextTranscript);
    };
    recognition.onerror = (event) => {
      setSpeechError(getSpeechErrorMessage(event.error));
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const startListening = async () => {
    setSpeechError("");
    setRecognizedText("");
    setFeedbackInputText("");
    setAiFeedback(null);
    setAnalysisError("");
    latestTranscriptRef.current = "";

    if (!recognitionRef.current) {
      setSpeechError(
        "이 브라우저에서는 음성 인식이 지원되지 않아요. Chrome 또는 Edge에서 열어주세요."
      );
      return;
    }

    const canUseMicrophone = await requestMicrophoneAccess();

    if (!canUseMicrophone.ok) {
      setSpeechError(canUseMicrophone.message);
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setSpeechError("이미 듣고 있어요. 잠시 후 다시 눌러주세요.");
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const openSpeaking = () => {
    setRecognizedText("");
    setFeedbackInputText("");
    setAiFeedback(null);
    setAnalysisError("");
    setSpeechError("");
    latestTranscriptRef.current = "";
    setStep("speaking");
  };

  const openFeedback = async () => {
    const capturedText = cleanTranscript(
      latestTranscriptRef.current || recognizedText
    );

    if (isListening) {
      stopListening();
    }

    if (!capturedText) {
      setSpeechError("먼저 영어로 말한 뒤 피드백을 눌러주세요.");
      return;
    }

    setFeedbackInputText(capturedText);
    setMistakeLog((items) =>
      mergeMistake(items, createMistakeFromFeedback(
        buildDemoFeedback(capturedText, selectedScenario),
        selectedScenario
      ))
    );
    setStep("feedback");
    setIsAnalyzing(true);
    setAnalysisError("");
    setAiFeedback(null);

    try {
      const result = await requestAiFeedback(capturedText, selectedScenario);
      setAiFeedback(result);
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "AI 피드백을 불러오지 못해 데모 피드백을 보여주고 있어요."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openMockPractice = () => {
    setMockFollowUpIndex(0);
    setMockFollowUpsStarted(false);
    setRecognizedText("");
    setSpeechError("");
    latestTranscriptRef.current = "";
    setStep("mockPractice");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.phoneFrame}>
        <View style={styles.header}>
          <View>
            <Text style={styles.appName}>FitSpeak</Text>
            <Text style={styles.tagline}>상황에 맞게, 말하고 싶은 바를 분명하게.</Text>
          </View>
          <View style={styles.statusPill}>
            <Ionicons name="mic-outline" size={16} color="#0F766E" />
            <Text style={styles.statusPillText}>Voice</Text>
          </View>
        </View>

        {step === "home" ? (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.heroPanel}>
              <Text style={styles.heroTitle}>
                말하고자 하는 바를 명확하게 말할 수 있도록 연습해보아요
              </Text>
              <Text style={styles.heroCopy}>
                문법만 고치는 게 아니라 상황에 맞게 자연스러움, 설득력, 구조화,
                논리, 즉답성을 함께 다듬어줄게요.
              </Text>
            </View>

            <View style={styles.sessionGrid}>
              <Pressable style={styles.sessionCard} onPress={() => setStep("review")}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="albums-outline" size={22} color="#0F766E" />
                </View>
                <View style={styles.sessionTextBlock}>
                  <Text style={styles.sessionTitle}>내 말버릇 복습</Text>
                  <Text style={styles.sessionCopy}>
                    내가 자주 쓰는 어색한 표현을 다시 말할 수 있게 정리
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color="#64748B" />
              </Pressable>

              <Pressable style={styles.sessionCard} onPress={() => setStep("mockSetup")}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="timer-outline" size={22} color="#0F766E" />
                </View>
                <View style={styles.sessionTextBlock}>
                  <Text style={styles.sessionTitle}>Mock Practice</Text>
                  <Text style={styles.sessionCopy}>
                    면접, 발표, 회의 등 실전 후속질문으로 제한 시간 연습
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.scenarioGrid}>
              {scenarios.map((item) => {
                const isSelected = item.id === selectedScenario;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    onPress={() => setSelectedScenario(item.id)}
                    style={[
                      styles.scenarioCard,
                      item.id === "freeTalk" && styles.featuredScenarioCard,
                      isSelected && styles.selectedCard
                    ]}
                  >
                    <View
                      style={[
                        styles.iconBubble,
                        isSelected && styles.selectedIconBubble
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={22}
                        color={isSelected ? "#FFFFFF" : "#0F766E"}
                      />
                    </View>
                    <Text style={styles.scenarioLabel}>{item.label}</Text>
                    <Text style={styles.scenarioDescription}>{item.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.primaryButton} onPress={openSpeaking}>
              <Ionicons name="mic" size={22} color="#5B3B00" />
              <Text style={styles.primaryButtonText}>{scenario.label} 연습 시작</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {step === "speaking" ? (
          <View style={styles.speakingContent}>
            <Pressable style={styles.backButton} onPress={() => setStep("home")}>
              <Ionicons name="chevron-back" size={22} color="#334155" />
              <Text style={styles.backButtonText}>상황 다시 선택</Text>
            </Pressable>

            <View style={styles.practiceCard}>
              <View style={styles.practiceLabelRow}>
                <Ionicons name={scenario.icon} size={18} color="#0F766E" />
                <Text style={styles.practiceLabel}>{scenario.label} 연습 중</Text>
              </View>
              <Text style={styles.practiceTitle}>
                {isListening ? "듣고 있어요" : "영어로 편하게 말해보세요"}
              </Text>
              <Text style={styles.practiceCopy}>
                {speechSupported
                  ? "마이크를 누른 뒤 영어로 말하면 인식된 문장이 아래에 표시돼요."
                  : "현재 브라우저가 음성 인식을 지원하지 않아 예시 문장으로 진행돼요."}
              </Text>

              <Pressable
                accessibilityRole="button"
                style={[styles.micButton, isListening && styles.listeningMicButton]}
                onPress={isListening ? stopListening : startListening}
              >
                <Ionicons
                  name={isListening ? "stop" : "mic"}
                  size={44}
                  color="#FFFFFF"
                />
              </Pressable>
              <Text style={styles.timerText}>
                {isListening ? "녹음 중" : spokenText ? "인식 완료" : "탭해서 시작"}
              </Text>
              <View style={styles.waveRow}>
                {[28, 44, 32, 56, 38, 48, 30].map((height, index) => (
                  <View
                    key={index}
                    style={[
                      styles.waveBar,
                      { height: isListening ? height : Math.max(16, height - 18) }
                    ]}
                  />
                ))}
              </View>

              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptLabel}>음성 인식 결과</Text>
                <Text style={styles.transcriptText}>
                  {spokenText || "아직 인식된 문장이 없어요."}
                </Text>
              </View>

              {activeReminder ? (
                <View style={styles.patternReminderBox}>
                  <Ionicons
                    name="color-wand-outline"
                    size={18}
                    color="#0F766E"
                  />
                  <View style={styles.reminderTextBlock}>
                    <Text style={styles.reminderLabel}>{activeReminder.label}</Text>
                    <Text style={styles.reminderText}>{activeReminder.reminder}</Text>
                  </View>
                </View>
              ) : null}

              {speechError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#B45309" />
                  <Text style={styles.errorText}>{speechError}</Text>
                </View>
              ) : null}

              <Pressable style={styles.secondaryButton} onPress={openFeedback}>
                <Text style={styles.secondaryButtonText}>
                  {isListening ? "녹음 멈추고 피드백 보기" : "피드백 보기"}
                </Text>
                <Ionicons name="arrow-forward" size={19} color="#0F766E" />
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === "feedback" ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable style={styles.backButton} onPress={() => setStep("speaking")}>
              <Ionicons name="chevron-back" size={22} color="#334155" />
              <Text style={styles.backButtonText}>다시 말하기</Text>
            </Pressable>

            <View style={styles.feedbackHeader}>
              <View style={styles.analysisPill}>
                <Ionicons
                  name={isAnalyzing ? "time-outline" : "sparkles-outline"}
                  size={15}
                  color="#0F766E"
                />
                <Text style={styles.analysisPillText}>
                  {isAnalyzing
                    ? "AI 피드백 생성 중"
                    : aiFeedback
                      ? "AI 피드백"
                      : "데모 피드백"}
                </Text>
              </View>
              <Text style={styles.feedbackTitle}>{scenario.label} 표현 피드백</Text>
              <Text style={styles.feedbackSubtitle}>
                {aiFeedback
                  ? `${scenarioCoachingGoals[selectedScenario]}에 맞춰 피드백했어요.`
                  : `${scenarioCoachingGoals[selectedScenario]}에 맞춰 핵심 패턴을 다듬어줘요.`}
              </Text>
            </View>

            {analysisError ? (
              <View style={styles.noticeBox}>
                <Ionicons name="information-circle-outline" size={18} color="#0F766E" />
                <Text style={styles.noticeText}>{analysisError}</Text>
              </View>
            ) : null}

            <FeedbackCard title="내가 말한 문장" tone="muted" text={feedback.original} />
            <FeedbackCard
              title="더 자연스러운 문장"
              tone="strong"
              text={feedback.improved}
            />
            <View style={styles.explainCard}>
              <Text style={styles.cardTitle}>왜 이렇게 바꿨나요?</Text>
              <Text style={styles.reasonText}>{feedback.reason}</Text>
            </View>

            <View style={styles.explainCard}>
              <Text style={styles.cardTitle}>상황별로 바로 쓸 표현</Text>
              {feedback.alternatives.map((item) => (
                <View key={item} style={styles.expressionRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#0F766E" />
                  <Text style={styles.expressionText}>{item}</Text>
                </View>
              ))}
            </View>

            <Pressable style={styles.primaryButton} onPress={openSpeaking}>
              <Ionicons name="refresh" size={21} color="#5B3B00" />
              <Text style={styles.primaryButtonText}>수정된 문장으로 다시 말하기</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {step === "review" ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable style={styles.backButton} onPress={() => setStep("home")}>
              <Ionicons name="chevron-back" size={22} color="#334155" />
              <Text style={styles.backButtonText}>홈으로</Text>
            </Pressable>

            <View style={styles.feedbackHeader}>
              <View style={styles.analysisPill}>
                <Ionicons name="albums-outline" size={15} color="#0F766E" />
                <Text style={styles.analysisPillText}>내 말버릇 복습</Text>
              </View>
              <Text style={styles.feedbackTitle}>전에 막혔던 표현을 다시 입에 붙여요</Text>
              <Text style={styles.feedbackSubtitle}>
                내가 했던 표현, 더 자연스러운 표현, 기억할 포인트를 카테고리별로
                모아두었어요.
              </Text>
            </View>

            {mistakeLog.map((item) => (
              <View key={item.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewLabel}>{item.label}</Text>
                  <Text style={styles.reviewPattern}>{item.pattern}</Text>
                </View>
                <Text style={styles.reviewSectionLabel}>전에 이렇게 말했어요</Text>
                <Text style={styles.reviewOriginal}>{item.original}</Text>
                <Ionicons name="arrow-down" size={18} color="#64748B" />
                <Text style={styles.reviewSectionLabel}>다음엔 이렇게 말해요</Text>
                <Text style={styles.reviewImproved}>{item.improved}</Text>
                <Text style={styles.reviewSectionLabel}>기억할 포인트</Text>
                <Text style={styles.reviewReminder}>{item.reminder}</Text>
                <Text style={styles.reviewSectionLabel}>짧은 예문</Text>
                {item.examples.map((example) => (
                  <View key={example} style={styles.reviewExampleRow}>
                    <Ionicons name="ellipse" size={6} color="#0F766E" />
                    <Text style={styles.reviewExampleText}>{example}</Text>
                  </View>
                ))}
              </View>
            ))}

            <Pressable style={styles.primaryButton} onPress={openSpeaking}>
              <Ionicons name="mic" size={21} color="#5B3B00" />
              <Text style={styles.primaryButtonText}>복습한 표현으로 다시 말하기</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {step === "mockSetup" ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable style={styles.backButton} onPress={() => setStep("home")}>
              <Ionicons name="chevron-back" size={22} color="#334155" />
              <Text style={styles.backButtonText}>홈으로</Text>
            </Pressable>

            <View style={styles.feedbackHeader}>
              <View style={styles.analysisPill}>
                <Ionicons name="timer-outline" size={15} color="#0F766E" />
                <Text style={styles.analysisPillText}>Mock Practice</Text>
              </View>
              <Text style={styles.feedbackTitle}>답변 후 후속질문까지 연습해요</Text>
              <Text style={styles.feedbackSubtitle}>
                상황과 시간을 정한 뒤 먼저 답변하고, 답변 후 꼬리 질문과 재질문을
                받아보세요.
              </Text>
            </View>

            <View style={styles.mockGrid}>
              {mockScenarios.map((item) => {
                const selected = item.id === selectedMockScenario;

                return (
                  <Pressable
                    key={item.id}
                    style={[styles.mockCard, selected && styles.selectedCard]}
                    onPress={() => setSelectedMockScenario(item.id)}
                  >
                    <View
                      style={[
                        styles.iconBubble,
                        selected && styles.selectedIconBubble
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={21}
                        color={selected ? "#FFFFFF" : "#0F766E"}
                      />
                    </View>
                    <Text style={styles.scenarioLabel}>{item.label}</Text>
                    <Text style={styles.scenarioDescription}>{item.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.explainCard}>
              <Text style={styles.cardTitle}>연습 시간</Text>
              <View style={styles.durationRow}>
                {mockDurations.map((minutes) => {
                  const selected = minutes === mockDuration;

                  return (
                    <Pressable
                      key={minutes}
                      style={[
                        styles.durationPill,
                        selected && styles.selectedDurationPill
                      ]}
                      onPress={() => setMockDuration(minutes)}
                    >
                      <Text
                        style={[
                          styles.durationText,
                          selected && styles.selectedDurationText
                        ]}
                      >
                        {minutes}분
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable style={styles.primaryButton} onPress={openMockPractice}>
              <Ionicons name="play" size={21} color="#5B3B00" />
              <Text style={styles.primaryButtonText}>Mock Practice 시작</Text>
            </Pressable>
          </ScrollView>
        ) : null}

        {step === "mockPractice" ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Pressable style={styles.backButton} onPress={() => setStep("mockSetup")}>
              <Ionicons name="chevron-back" size={22} color="#334155" />
              <Text style={styles.backButtonText}>설정으로</Text>
            </Pressable>

            <View style={styles.mockPracticePanel}>
              <View style={styles.practiceLabelRow}>
                <Ionicons name={selectedMock.icon} size={18} color="#0F766E" />
                <Text style={styles.practiceLabel}>
                  {selectedMock.label} · {mockDuration}분
                </Text>
              </View>
              <Text style={styles.practiceTitle}>실전 응답을 시작해보세요</Text>
              <Text style={styles.practiceCopy}>
                먼저 메인 질문에 답변하고, 답변이 끝난 뒤 후속질문을 받아 실전처럼
                이어서 말해보세요.
              </Text>

              <View style={[styles.challengeCard, styles.mainQuestionCard]}>
                <Text style={styles.challengeType}>Main question</Text>
                <Text style={styles.challengeQuestion}>
                  {getMockMainQuestion(selectedMockScenario)}
                </Text>
              </View>

              {mockFollowUpsStarted ? (
                <View
                  style={[
                    styles.challengeCard,
                    {
                      backgroundColor: currentMockChallenge.backgroundColor,
                      borderColor: currentMockChallenge.color
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.challengeType,
                      { color: currentMockChallenge.color }
                    ]}
                  >
                    {currentMockChallenge.label}
                  </Text>
                  <Text style={styles.challengeQuestion}>
                    {getMockQuestion(selectedMockScenario, mockFollowUpIndex)}
                  </Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                style={[styles.micButton, isListening && styles.listeningMicButton]}
                onPress={isListening ? stopListening : startListening}
              >
                <Ionicons
                  name={isListening ? "stop" : "mic"}
                  size={44}
                  color="#FFFFFF"
                />
              </Pressable>

              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptLabel}>내 답변</Text>
                <Text style={styles.transcriptText}>
                  {spokenText || "마이크를 누르고 답변해보세요."}
                </Text>
              </View>

              <View style={styles.mockActionRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    if (mockFollowUpsStarted) {
                      setMockFollowUpIndex((index) => index + 1);
                      return;
                    }

                    setMockFollowUpsStarted(true);
                  }}
                >
                  <Text style={styles.secondaryButtonText}>
                    {mockFollowUpsStarted ? "다음 후속질문" : "답변 완료 · 후속질문 받기"}
                  </Text>
                  <Ionicons name="shuffle" size={19} color="#0F766E" />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function findActiveReminder(text: string, mistakes: MistakeItem[]) {
  const normalized = text.toLowerCase();

  if (!normalized) {
    return null;
  }

  return mistakes.find((item) => normalized.includes(item.pattern)) ?? null;
}

function mergeMistake(items: MistakeItem[], nextItem: MistakeItem) {
  const withoutDuplicate = items.filter((item) => item.id !== nextItem.id);
  return [nextItem, ...withoutDuplicate].slice(0, 8);
}

function createMistakeFromFeedback(
  feedback: Feedback,
  scenarioId: ScenarioId
): MistakeItem {
  const matchedPattern = patternReminders.find((item) =>
    feedback.original.toLowerCase().includes(item.pattern)
  );

  if (matchedPattern) {
    return {
      ...matchedPattern,
      original: feedback.original,
      improved: feedback.improved
    };
  }

  const labelByScenario: Record<ScenarioId, string> = {
    freeTalk: "프리토킹 구조",
    meeting: "회의 톤",
    presentation: "발표 구조",
    interview: "면접 답변",
    travel: "여행 표현"
  };

  return {
    id: `custom-${scenarioId}-${feedback.original.toLowerCase().slice(0, 24)}`,
    pattern: feedback.original.toLowerCase().split(" ").slice(0, 3).join(" "),
    label: labelByScenario[scenarioId],
    original: feedback.original,
    improved: feedback.improved,
    reminder: "비슷한 시작 구조가 나오면 더 자연스러운 문장 순서로 다시 다듬어보세요.",
    examples: feedback.alternatives.map((item) => `대체 표현: ${item}`).slice(0, 3),
    color: "#0F766E",
    backgroundColor: "#DDF7EF"
  };
}

function getMockQuestion(scenarioId: MockScenarioId, index: number) {
  const questionBank: Record<MockScenarioId, string[]> = {
    jobInterview: [
      "Can you give me a specific example of when you handled pressure?",
      "That sounds general. What exactly was your role?",
      "What was the measurable result of your action?",
      "If that approach failed, what would you do differently?"
    ],
    presentation: [
      "Can you summarize your main point in one sentence?",
      "Why should this audience care right now?",
      "What evidence supports that point?",
      "Could you rephrase that for someone outside your team?"
    ],
    meeting: [
      "What trade-off are you asking the team to accept?",
      "What if another team disagrees with this direction?",
      "What decision do you need from the team today?",
      "Could you clarify what you need from us today?"
    ],
    networking: [
      "What kind of work are you most interested in these days?",
      "That's interesting. How did you get into that?",
      "How would you explain your work in one simple sentence?",
      "Could you explain that in a more casual way?"
    ],
    conferenceQa: [
      "How would you respond to someone who disagrees with your conclusion?",
      "What assumption in your answer is the weakest?",
      "Can you answer that more directly?",
      "Could you repeat the key point with a concrete example?"
    ]
  };

  const questions = questionBank[scenarioId];
  return questions[index % questions.length];
}

function getMockMainQuestion(scenarioId: MockScenarioId) {
  const mainQuestions: Record<MockScenarioId, string> = {
    jobInterview:
      "Tell me about yourself and why you are a good fit for this role.",
    presentation:
      "Please present the main idea of your project or proposal in a clear opening statement.",
    meeting:
      "What issue would you like to discuss today, and what outcome are you hoping for?",
    networking:
      "Please introduce yourself and explain what kind of work or opportunities you are interested in.",
    conferenceQa:
      "Please summarize your answer to the audience's main question in a clear and concise way."
  };

  return mainQuestions[scenarioId];
}

function buildDemoFeedback(spokenText: string, scenarioId: ScenarioId): Feedback {
  const fallback = defaultFeedbackByScenario[scenarioId];
  const text = cleanTranscript(spokenText);

  if (!text) {
    return fallback;
  }

  const lowerText = text.toLowerCase();

  if (lowerText.includes("explain about")) {
    return {
      original: text,
      improved: capitalizeFirst(text.replace(/explain about/gi, "walk you through")),
      reason:
        "explain about은 한국인이 자주 쓰는 표현이지만 영어에서는 어색하게 들릴 수 있어요. 발표나 설명 상황에서는 walk you through가 더 자연스럽고 청중을 안내하는 느낌을 줍니다.",
      alternatives: [
        "Let me walk you through this.",
        "I'd like to give you a quick overview.",
        "Let me explain the key point here."
      ]
    };
  }

  if (lowerText.includes("discuss about")) {
    return {
      original: text,
      improved: capitalizeFirst(text.replace(/discuss about/gi, "discuss")),
      reason:
        "discuss는 타동사라 뒤에 about을 붙이지 않는 편이 자연스러워요. 회의에서는 discuss보다 revisit이나 align on을 쓰면 더 부드럽게 들립니다.",
      alternatives: [
        "Let's revisit this point together.",
        "I'd like to align on this issue.",
        "Maybe we could take another look at this."
      ]
    };
  }

  if (lowerText.includes("how can i go")) {
    return {
      original: text,
      improved: capitalizeFirst(text.replace(/how can i go/gi, "how can I get there")),
      reason:
        "길을 물을 때는 How can I go?보다 How can I get there?가 훨씬 자연스럽습니다. 목적지 앞에는 go to를 함께 쓰는 것도 기억하면 좋아요.",
      alternatives: [
        "Could you tell me how to get there?",
        "What's the best way to get there?",
        "Which train should I take to get there?"
      ]
    };
  }

  if (lowerText.includes("i want to")) {
    return {
      original: text,
      improved: capitalizeFirst(text.replace(/i want to/gi, "I'd like to")),
      reason:
        "I want to도 맞지만 발표, 면접, 회의에서는 I'd like to가 더 정중하고 자연스럽습니다. 같은 뜻이어도 상황에 맞는 톤으로 바꾸면 훨씬 편안하게 들려요.",
      alternatives: [
        "I'd like to share one point.",
        "I'd like to explain this briefly.",
        "What I'd like to emphasize is..."
      ]
    };
  }

  return {
    original: text,
    improved: makeScenarioImprovement(text, scenarioId),
    reason: getScenarioReason(scenarioId),
    alternatives: getScenarioAlternatives(scenarioId)
  };
}

function cleanTranscript(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function capitalizeFirst(text: string) {
  if (!text) {
    return text;
  }

  return text.charAt(0).toUpperCase() + text.slice(1);
}

function makeScenarioImprovement(text: string, scenarioId: ScenarioId) {
  const sentence = text.replace(/[.?!]*$/, "");

  if (scenarioId === "meeting") {
    return `I'd like to propose one clear next step: ${sentence}.`;
  }

  if (scenarioId === "presentation") {
    return `I'll start with the key point, then walk you through the reason: ${sentence}.`;
  }

  if (scenarioId === "interview") {
    return `One example that shows my strength is this: ${sentence}.`;
  }

  if (scenarioId === "freeTalk") {
    return `Let me put it this way: ${sentence}.`;
  }

  return `Excuse me, I need help with this: ${sentence}.`;
}

function getScenarioReason(scenarioId: ScenarioId) {
  if (scenarioId === "freeTalk") {
    return "프리토킹에서는 대화가 끊기지 않게 자연스럽고 유창하게 이어가는 것이 중요해요. 그래서 말의 시작을 부드럽게 만들고, 상대가 쉽게 반응할 수 있는 구조로 다듬었습니다.";
  }

  if (scenarioId === "meeting") {
    return "회의에서는 단순히 의견을 말하는 것보다 설득력 있게 다음 행동을 제안하는 게 중요해요. 그래서 business English 톤으로 목적과 next step이 보이게 다듬었습니다.";
  }

  if (scenarioId === "presentation") {
    return "발표에서는 구조화와 전달력이 핵심이에요. 핵심을 먼저 말하고, 그다음 이유나 흐름을 안내하는 구조로 바꾸면 청중이 따라오기 쉬워집니다.";
  }

  if (scenarioId === "interview") {
    return "면접에서는 논리와 STAR 구조, 자신감이 중요해요. 추상적인 말보다 한 가지 사례를 중심으로 Situation, Action, Result가 보이게 말하는 방향으로 다듬었습니다.";
  }

  return "여행에서는 완벽한 문장보다 바로 통하는 생존형 표현과 즉답성이 중요해요. 짧고 분명하게 도움을 요청하는 구조로 바꾸면 실제 상황에서 바로 쓰기 좋습니다.";
}

function getScenarioAlternatives(scenarioId: ScenarioId) {
  if (scenarioId === "freeTalk") {
    return [
      "Let me put it this way.",
      "What I mean is...",
      "I guess what I'm trying to say is..."
    ];
  }

  if (scenarioId === "meeting") {
    return [
      "I'd like to add one quick point.",
      "It might be worth looking at this again.",
      "Can we align on this before moving forward?"
    ];
  }

  if (scenarioId === "presentation") {
    return [
      "Let me give you a quick overview.",
      "I'd like to highlight one key point.",
      "What I want to emphasize here is..."
    ];
  }

  if (scenarioId === "interview") {
    return [
      "One experience that shaped me was...",
      "What I learned from that was...",
      "I believe this experience helped me build..."
    ];
  }

  return [
    "Could you help me with this?",
    "Could you tell me how to get there?",
    "I'd like to ask one quick question."
  ];
}

async function requestAiFeedback(text: string, scenarioId: ScenarioId) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("http://localhost:8787/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text,
        scenario: scenarioId
      }),
      signal: controller.signal
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(
        payload?.message ??
          "AI 서버가 아직 준비되지 않아 데모 피드백을 보여주고 있어요."
      );
    }

    return normalizeFeedback(payload.feedback, text, scenarioId);
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("AI 응답이 지연되어 데모 피드백을 먼저 보여주고 있어요.");
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeFeedback(
  feedback: Partial<Feedback> | undefined,
  originalText: string,
  scenarioId: ScenarioId
): Feedback {
  const fallback = buildDemoFeedback(originalText, scenarioId);

  return {
    original: cleanTranscript(feedback?.original ?? originalText) || fallback.original,
    improved: cleanTranscript(feedback?.improved ?? "") || fallback.improved,
    reason: cleanTranscript(feedback?.reason ?? "") || fallback.reason,
    alternatives:
      Array.isArray(feedback?.alternatives) && feedback.alternatives.length > 0
        ? feedback.alternatives
            .map((item) => cleanTranscript(String(item)))
            .filter(Boolean)
            .slice(0, 4)
        : fallback.alternatives
  };
}

function getSpeechErrorMessage(error?: string) {
  if (error === "not-allowed") {
    return "마이크 권한이 필요해요. 브라우저 주소창의 권한 설정에서 마이크를 허용해주세요.";
  }

  if (error === "no-speech") {
    return "말소리가 잘 들리지 않았어요. 조금 더 가까이에서 다시 말해보세요.";
  }

  return "음성 인식 중 문제가 생겼어요. 다시 한 번 시도해주세요.";
}

async function requestMicrophoneAccess() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      message:
        "이 브라우저에서는 마이크 접근이 제한돼요. Chrome 또는 Edge에서 열어주세요."
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());

    return { ok: true, message: "" };
  } catch {
    return {
      ok: false,
      message:
        "마이크 권한이 아직 앱에 전달되지 않았어요. 브라우저 권한에서 마이크를 허용한 뒤 새로고침해주세요."
    };
  }
}

function FeedbackCard({
  title,
  text,
  tone
}: {
  title: string;
  text: string;
  tone: "muted" | "strong";
}) {
  return (
    <View style={[styles.feedbackCard, tone === "strong" && styles.strongCard]}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={[styles.feedbackText, tone === "strong" && styles.strongText]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FEF9C3"
  },
  phoneFrame: {
    flex: 1,
    backgroundColor: "#FFFBEB"
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 12
  },
  appName: {
    color: "#0F172A",
    fontSize: 24,
    fontWeight: "800"
  },
  tagline: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 4
  },
  statusPill: {
    alignItems: "center",
    backgroundColor: "#DDF7EF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  statusPillText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "700"
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 28
  },
  heroPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  heroTitle: {
    color: "#0F172A",
    fontSize: 25,
    fontWeight: "800",
    lineHeight: 32
  },
  heroCopy: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10
  },
  sessionGrid: {
    gap: 10
  },
  sessionCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  sessionIcon: {
    alignItems: "center",
    backgroundColor: "#EAF4F1",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  sessionTextBlock: {
    flex: 1
  },
  sessionTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800"
  },
  sessionCopy: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
  },
  scenarioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  scenarioCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 132,
    padding: 14,
    width: "48%"
  },
  featuredScenarioCard: {
    minHeight: 112,
    width: "100%"
  },
  selectedCard: {
    borderColor: "#0F766E",
    borderWidth: 2
  },
  iconBubble: {
    alignItems: "center",
    backgroundColor: "#EAF4F1",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  selectedIconBubble: {
    backgroundColor: "#0F766E"
  },
  scenarioLabel: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 12
  },
  scenarioDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#FDE68A",
    borderColor: "#FACC15",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18
  },
  primaryButtonText: {
    color: "#5B3B00",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#0F766E",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 16,
    width: "100%"
  },
  secondaryButtonText: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "800"
  },
  speakingContent: {
    flex: 1,
    padding: 20
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    paddingVertical: 8
  },
  backButtonText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "700"
  },
  practiceCard: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    marginTop: 12,
    padding: 22
  },
  practiceLabelRow: {
    alignItems: "center",
    backgroundColor: "#EAF4F1",
    borderRadius: 999,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  practiceLabel: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "800"
  },
  practiceTitle: {
    color: "#0F172A",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: 22,
    textAlign: "center"
  },
  practiceCopy: {
    color: "#64748B",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: "center"
  },
  micButton: {
    alignItems: "center",
    backgroundColor: "#0F766E",
    borderRadius: 999,
    height: 112,
    justifyContent: "center",
    marginTop: 26,
    shadowColor: "#0F766E",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    width: 112
  },
  listeningMicButton: {
    backgroundColor: "#DC2626",
    shadowColor: "#DC2626"
  },
  timerText: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 16
  },
  waveRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: 54,
    marginTop: 10
  },
  waveBar: {
    backgroundColor: "#99D7CB",
    borderRadius: 99,
    width: 7
  },
  transcriptBox: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
    width: "100%"
  },
  transcriptLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6
  },
  transcriptText: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23
  },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 12,
    width: "100%"
  },
  errorText: {
    color: "#92400E",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  patternReminderBox: {
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    padding: 12,
    width: "100%"
  },
  reminderTextBlock: {
    flex: 1
  },
  reminderLabel: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 3
  },
  reminderText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  noticeBox: {
    alignItems: "flex-start",
    backgroundColor: "#EAF4F1",
    borderColor: "#99D7CB",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12
  },
  noticeText: {
    color: "#0F766E",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  feedbackHeader: {
    gap: 7
  },
  analysisPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#DDF7EF",
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  analysisPillText: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "800"
  },
  feedbackTitle: {
    color: "#0F172A",
    fontSize: 25,
    fontWeight: "800"
  },
  feedbackSubtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21
  },
  feedbackCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  strongCard: {
    backgroundColor: "#EAF4F1",
    borderColor: "#99D7CB"
  },
  cardTitle: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8
  },
  feedbackText: {
    color: "#334155",
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 25
  },
  strongText: {
    color: "#0F172A",
    fontSize: 20,
    lineHeight: 29
  },
  explainCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  reasonText: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 23
  },
  reviewCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 15
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  reviewLabel: {
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900"
  },
  reviewPattern: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800"
  },
  reviewOriginal: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  reviewSectionLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4
  },
  reviewImproved: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24
  },
  reviewReminder: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  reviewExampleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    paddingTop: 5
  },
  reviewExampleText: {
    color: "#334155",
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19
  },
  mockGrid: {
    gap: 12
  },
  mockCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 14
  },
  durationRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  durationPill: {
    alignItems: "center",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 68,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  selectedDurationPill: {
    backgroundColor: "#0F766E",
    borderColor: "#0F766E"
  },
  durationText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800"
  },
  selectedDurationText: {
    color: "#FFFFFF"
  },
  mockPracticePanel: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    padding: 20
  },
  challengeCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
    width: "100%"
  },
  mainQuestionCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1"
  },
  challengeType: {
    color: "#0F766E",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8
  },
  challengeQuestion: {
    color: "#0F172A",
    fontSize: 19,
    fontWeight: "800",
    lineHeight: 27
  },
  mockActionRow: {
    width: "100%"
  },
  expressionRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9,
    paddingVertical: 7
  },
  expressionText: {
    color: "#334155",
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22
  }
});
