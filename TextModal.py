"""
Text Emotion & Sentiment Pipeline

End-to-end script that:

1. Trains three transformer models on:
   - Basic emotions    (5 classes: anger, fear, joy, sadness, surprise)
                       → EmoRoBERTa-X on Twitter Emotion dataset
   - Advanced emotions (28 classes: full GoEmotions label space)
                       → EmoRoBERTa-X on GoEmotions
   - Sentiment polarity (3 classes: negative, neutral, positive)
                       → DeBERTa on TweetEval sentiment

2. Saves best models to:
   - ./models/basic_emotion_best
   - ./models/advanced_emotion_best
   - ./models/sentiment_best

3. Provides explainable inference with attention visualization and an
   ensemble analyzer combining all three models.

Optimized for ~4GB GPU using:
   - EmoRoBERTa-X / DeBERTa with only the final transformer layer unfrozen
   - max_seq_length = 256
   - per_device_batch_size = 4
   - gradient_accumulation_steps = 4 (effective batch = 16)
   - optional fp16
"""

import os
import re
from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional, Any

import numpy as np
import pandas as pd
import torch
from datasets import load_dataset, Dataset, DatasetDict
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    roc_auc_score,
    log_loss,
    confusion_matrix,
)

import matplotlib.pyplot as plt
import seaborn as sns

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
    DataCollatorWithPadding,
    pipeline,
)


# ==================== GLOBAL CONFIG ====================

EMORO_CHECKPOINT     = "arpanghoshal/EmoRoBERTa"    # EmoRoBERTa-X for basic + advanced
SENTIMENT_CHECKPOINT = "microsoft/deberta-v3-base"  # DeBERTa for sentiment

BATCH_SIZE       = 4
GRAD_ACCUM_STEPS = 4
NUM_EPOCHS       = 5
MAX_SEQ_LENGTH   = 256
LEARNING_RATE    = 2e-5

device   = torch.device("cuda" if torch.cuda.is_available() else "cpu")
USE_FP16 = bool(torch.cuda.is_available())

print(f"Using device      : {device}")
print(f"Basic/Adv model   : {EMORO_CHECKPOINT}")
print(f"Sentiment model   : {SENTIMENT_CHECKPOINT}")
print(f"Batch size: {BATCH_SIZE}, GradAccum: {GRAD_ACCUM_STEPS}, MaxLen: {MAX_SEQ_LENGTH}, fp16: {USE_FP16}")


# ==================== EMOTION LABEL SPACES ====================

BASIC_EMOTIONS = ["anger", "fear", "joy", "sadness", "surprise"]

ADVANCED_EMOTIONS = [
    "admiration", "amusement", "anger", "annoyance", "approval", "caring",
    "confusion", "curiosity", "desire", "disappointment", "disapproval",
    "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief",
    "joy", "love", "nervousness", "neutral", "optimism", "pride",
    "realization", "relief", "remorse", "sadness", "surprise",
]

SENTIMENT_LABELS = ["negative", "neutral", "positive"]

BASIC_LABEL2ID    = {e: i for i, e in enumerate(BASIC_EMOTIONS)}
BASIC_ID2LABEL    = {i: e for i, e in enumerate(BASIC_EMOTIONS)}

ADVANCED_LABEL2ID = {e: i for i, e in enumerate(ADVANCED_EMOTIONS)}
ADVANCED_ID2LABEL = {i: e for i, e in enumerate(ADVANCED_EMOTIONS)}

SENTIMENT_LABEL2ID = {e: i for i, e in enumerate(SENTIMENT_LABELS)}
SENTIMENT_ID2LABEL = {i: e for i, e in enumerate(SENTIMENT_LABELS)}


# ==================== DATA STRUCTURES ====================

@dataclass
class TextEmotionResult:
    text: str
    predicted_emotion: str
    confidence: float
    all_probabilities: Dict[str, float]
    important_tokens: List[Tuple[str, float]]
    attention_weights: np.ndarray
    sentiment_indicators: Dict[str, Any]
    model_name: str
    basic_emotion: Optional[str] = None
    advanced_emotion: Optional[str] = None
    sentiment: Optional[str] = None


@dataclass
class SentimentIndicators:
    positive_words: List[str]
    negative_words: List[str]
    intensifiers: List[str]
    negations: List[str]
    emotional_phrases: List[str]
    text_length: int
    exclamation_count: int
    question_count: int


# ==================== ENHANCED TEXT EMOTION MODEL ====================

class EnhancedTextEmotionModel:

    def __init__(self, model_path: str, model_name: str = "basic"):
        print(f"\n[EnhancedTextEmotionModel] Loading '{model_name}' model from {model_path}...")

        self.model_name = model_name
        self.tokenizer  = AutoTokenizer.from_pretrained(model_path)
        self.model      = AutoModelForSequenceClassification.from_pretrained(model_path)
        self.device     = device
        self.model.to(self.device)
        self.model.eval()

        self.id2label = self.model.config.id2label
        self.label2id = self.model.config.label2id

        self._initialize_sentiment_lexicons()

        print(f"Model loaded: {len(self.id2label)} classes")
        print(f"   Labels: {list(self.id2label.values())}")

    def _initialize_sentiment_lexicons(self):
        self.positive_words = {
            "happy", "joy", "excited", "wonderful", "amazing", "great", "love",
            "excellent", "fantastic", "delighted", "pleased", "cheerful", "glad",
            "thrilled", "ecstatic", "blessed", "grateful", "fortunate", "lucky",
        }
        self.negative_words = {
            "sad", "angry", "upset", "disappointed", "frustrated", "annoyed",
            "depressed", "miserable", "terrible", "awful", "horrible", "hate",
            "worried", "anxious", "scared", "afraid", "fearful", "hopeless",
            "lonely", "isolated", "tired", "exhausted", "worthless",
        }
        self.intensifiers = {
            "very", "really", "extremely", "incredibly", "absolutely", "totally",
            "completely", "utterly", "so", "too", "quite", "highly", "deeply",
        }
        self.negations = {
            "not", "no", "never", "neither", "nowhere", "nobody", "nothing",
            "n't", "dont", "cant", "wont", "shouldnt", "couldnt", "wouldnt",
        }

    def predict_with_attention(self, text: str) -> TextEmotionResult:
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=MAX_SEQ_LENGTH,
            return_special_tokens_mask=True,
        )

        input_ids      = inputs["input_ids"].to(self.device)
        attention_mask = inputs["attention_mask"].to(self.device)

        with torch.no_grad():
            outputs = self.model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                output_attentions=True,
                output_hidden_states=False,
            )

        logits          = outputs.logits
        probabilities   = torch.softmax(logits, dim=-1)[0]
        predicted_class = torch.argmax(probabilities).item()

        predicted_emotion = self.id2label[predicted_class]
        confidence        = probabilities[predicted_class].item()

        all_probs = {
            self.id2label[i]: probabilities[i].item()
            for i in range(len(probabilities))
        }

        attentions      = outputs.attentions
        last_layer_attn = attentions[-1]
        avg_attention   = last_layer_attn.mean(dim=1)[0]
        cls_attention   = avg_attention[0].detach().cpu().numpy()

        tokens              = self.tokenizer.convert_ids_to_tokens(input_ids[0])
        special_tokens_mask = inputs["special_tokens_mask"][0].detach().cpu().numpy()

        important_tokens     = self._calculate_token_importance(tokens, cls_attention, special_tokens_mask)
        sentiment_indicators = self._extract_sentiment_indicators(text)

        return TextEmotionResult(
            text=text,
            predicted_emotion=predicted_emotion,
            confidence=confidence,
            all_probabilities=all_probs,
            important_tokens=important_tokens,
            attention_weights=cls_attention,
            sentiment_indicators=sentiment_indicators.__dict__,
            model_name=self.model_name,
        )

    def _calculate_token_importance(
        self,
        tokens: List[str],
        attention_weights: np.ndarray,
        special_tokens_mask: np.ndarray,
    ) -> List[Tuple[str, float]]:
        token_scores: List[Tuple[str, float]] = []
        for i, (token, is_special) in enumerate(zip(tokens, special_tokens_mask)):
            if is_special == 0:
                cleaned = token.replace("##", "").replace("Ġ", "").replace("▁", "")
                score   = float(attention_weights[i])
                token_scores.append((cleaned, score))
        token_scores.sort(key=lambda x: x[1], reverse=True)
        return token_scores

    def _extract_sentiment_indicators(self, text: str) -> SentimentIndicators:
        text_lower = text.lower()
        words      = re.findall(r"\b\w+\b", text_lower)

        positive_found     = [w for w in words if w in self.positive_words]
        negative_found     = [w for w in words if w in self.negative_words]
        intensifiers_found = [w for w in words if w in self.intensifiers]
        negations_found    = [w for w in words if w in self.negations]

        emotional_phrases: List[str] = []
        for i in range(len(words) - 1):
            if words[i] in self.intensifiers and words[i + 1] in (self.positive_words | self.negative_words):
                emotional_phrases.append(f"{words[i]} {words[i+1]}")

        return SentimentIndicators(
            positive_words=positive_found,
            negative_words=negative_found,
            intensifiers=intensifiers_found,
            negations=negations_found,
            emotional_phrases=emotional_phrases,
            text_length=len(words),
            exclamation_count=text.count("!"),
            question_count=text.count("?"),
        )

    def visualize_attention(self, result: TextEmotionResult, save_path: Optional[str] = None):
        top_tokens = result.important_tokens[:20]
        if not top_tokens:
            print("No tokens to visualize.")
            return

        tokens, scores = zip(*top_tokens)
        fig, ax = plt.subplots(figsize=(12, 6))
        colors  = ["green" if s > np.mean(scores) else "orange" for s in scores]
        ax.barh(range(len(tokens)), scores, color=colors)
        ax.set_yticks(range(len(tokens)))
        ax.set_yticklabels(tokens)
        ax.set_xlabel("Attention Weight")
        ax.set_title(
            f'Token Importance for "{result.predicted_emotion}"\n'
            f"Confidence: {result.confidence:.2%}"
        )
        ax.invert_yaxis()
        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches="tight")
            print(f"Attention visualization saved to {save_path}")

        plt.show()

    def explain_prediction(self, result: TextEmotionResult) -> str:
        parts: List[str] = []

        parts.append(f"Emotion Analysis: {result.predicted_emotion.upper()}")
        parts.append(f"   Confidence: {result.confidence:.1%}\n")

        parts.append("Most Important Words:")
        for i, (token, score) in enumerate(result.important_tokens[:5], 1):
            parts.append(f"   {i}. '{token}' (importance: {score:.3f})")
        parts.append("")

        ind = result.sentiment_indicators
        parts.append("Linguistic Indicators:")
        if ind["positive_words"]:
            parts.append(f"   Positive words: {', '.join(ind['positive_words'][:5])}")
        if ind["negative_words"]:
            parts.append(f"   Negative words: {', '.join(ind['negative_words'][:5])}")
        if ind["intensifiers"]:
            parts.append(f"   Intensifiers: {', '.join(ind['intensifiers'][:3])}")
        if ind["negations"]:
            parts.append(f"   Negations detected: {', '.join(ind['negations'])}")
        if ind["emotional_phrases"]:
            parts.append(f"   Emotional phrases: {', '.join(ind['emotional_phrases'][:3])}")

        parts.append("\nText Characteristics:")
        parts.append(f"   Length: {ind['text_length']} words")
        parts.append(f"   Exclamations: {ind['exclamation_count']}")
        parts.append(f"   Questions: {ind['question_count']}")

        parts.append("\nAlternative Interpretations:")
        sorted_probs = sorted(result.all_probabilities.items(), key=lambda x: x[1], reverse=True)
        for emotion, prob in sorted_probs[1:4]:
            if prob > 0.1:
                parts.append(f"   {emotion}: {prob:.1%}")

        return "\n".join(parts)


# ==================== ENSEMBLE TEXT ANALYZER ====================

class EnsembleTextEmotionAnalyzer:

    def __init__(self, basic_model_path: str, advanced_model_path: str, sentiment_model_path: str):
        print("\nInitializing Ensemble Text Emotion Analyzer...")
        self.basic_model    = EnhancedTextEmotionModel(basic_model_path, "basic")
        self.advanced_model = EnhancedTextEmotionModel(advanced_model_path, "advanced")
        self.sentiment_model = EnhancedTextEmotionModel(sentiment_model_path, "sentiment")
        print("All models loaded successfully!")

    def analyze(self, text: str) -> Dict[str, Any]:
        print(f"\nAnalyzing: '{text[:50]}...'")

        basic_result    = self.basic_model.predict_with_attention(text)
        advanced_result = self.advanced_model.predict_with_attention(text)
        sentiment_result = self.sentiment_model.predict_with_attention(text)

        combined = {
            "text": text,
            "predictions": {
                "basic_emotion": {
                    "emotion":    basic_result.predicted_emotion,
                    "confidence": basic_result.confidence,
                    "top_words":  basic_result.important_tokens[:5],
                },
                "advanced_emotion": {
                    "emotion":    advanced_result.predicted_emotion,
                    "confidence": advanced_result.confidence,
                    "top_words":  advanced_result.important_tokens[:5],
                },
                "sentiment": {
                    "sentiment":  sentiment_result.predicted_emotion,
                    "confidence": sentiment_result.confidence,
                    "top_words":  sentiment_result.important_tokens[:5],
                },
            },
            "linguistic_indicators": basic_result.sentiment_indicators,
            "explanation": self._generate_combined_explanation(basic_result, advanced_result, sentiment_result),
            "raw_results": {
                "basic":    basic_result,
                "advanced": advanced_result,
                "sentiment": sentiment_result,
            },
        }
        return combined

    def _generate_combined_explanation(
        self,
        basic_result: TextEmotionResult,
        advanced_result: TextEmotionResult,
        sentiment_result: TextEmotionResult,
    ) -> str:
        lines: List[str] = []
        lines.append("=" * 60)
        lines.append("COMPLETE EMOTION ANALYSIS")
        lines.append("=" * 60)

        lines.append("\nModel Predictions:")
        lines.append(f"   Basic Emotion    : {basic_result.predicted_emotion} ({basic_result.confidence:.1%})")
        lines.append(f"   Advanced Emotion : {advanced_result.predicted_emotion} ({advanced_result.confidence:.1%})")
        lines.append(f"   Sentiment        : {sentiment_result.predicted_emotion} ({sentiment_result.confidence:.1%})")

        basic_words    = {w for w, _ in basic_result.important_tokens[:10]}
        advanced_words = {w for w, _ in advanced_result.important_tokens[:10]}
        shared_words   = basic_words & advanced_words

        if shared_words:
            lines.append(f"\nCorroborating Key Words: {', '.join(list(shared_words)[:5])}")

        lines.append("\nKey Influential Tokens (Basic Model):")
        for token, score in basic_result.important_tokens[:5]:
            lines.append(f"   '{token}': {score:.3f}")

        ind = basic_result.sentiment_indicators
        lines.append("\nLinguistic Signals:")
        if ind["positive_words"]:
            lines.append(f"   Positive markers: {', '.join(ind['positive_words'][:3])}")
        if ind["negative_words"]:
            lines.append(f"   Negative markers: {', '.join(ind['negative_words'][:3])}")
        if ind["negations"]:
            lines.append(f"   Negation markers: {', '.join(ind['negations'][:3])}")

        return "\n".join(lines)

    def visualize_ensemble(self, results: Dict[str, Any], save_dir: Optional[str] = None):
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        fig.suptitle("Text Emotion Ensemble Analysis", fontsize=14, fontweight="bold")

        ax1 = axes[0, 0]
        models      = ["Basic", "Advanced", "Sentiment"]
        confidences = [
            results["predictions"]["basic_emotion"]["confidence"],
            results["predictions"]["advanced_emotion"]["confidence"],
            results["predictions"]["sentiment"]["confidence"],
        ]
        emotions = [
            results["predictions"]["basic_emotion"]["emotion"],
            results["predictions"]["advanced_emotion"]["emotion"],
            results["predictions"]["sentiment"]["sentiment"],
        ]
        colors = ["#3498db", "#e74c3c", "#2ecc71"]
        bars   = ax1.bar(models, confidences, color=colors, alpha=0.7)
        ax1.set_ylabel("Confidence")
        ax1.set_title("Model Confidence Comparison")
        ax1.set_ylim(0, 1)
        for bar, emotion in zip(bars, emotions):
            ax1.text(bar.get_x() + bar.get_width() / 2.0, bar.get_height(),
                     emotion, ha="center", va="bottom", fontsize=9)

        ax2 = axes[0, 1]
        basic_result = results["raw_results"]["basic"]
        top_words    = basic_result.important_tokens[:10]
        if top_words:
            words, scores = zip(*top_words)
            ax2.barh(range(len(words)), scores, color="#3498db", alpha=0.7)
            ax2.set_yticks(range(len(words)))
            ax2.set_yticklabels(words)
            ax2.set_xlabel("Attention Weight")
            ax2.set_title("Most Important Words (Basic Model)")
            ax2.invert_yaxis()

        ax3 = axes[1, 0]
        ind = results["linguistic_indicators"]
        indicator_counts = {
            "Positive\nWords":  len(ind["positive_words"]),
            "Negative\nWords":  len(ind["negative_words"]),
            "Intensifiers":     len(ind["intensifiers"]),
            "Negations":        len(ind["negations"]),
        }
        colors_ind = [
            "green"  if "Positive" in k
            else "red" if "Negative" in k
            else "orange"
            for k in indicator_counts.keys()
        ]
        ax3.bar(indicator_counts.keys(), indicator_counts.values(), color=colors_ind, alpha=0.7)
        ax3.set_ylabel("Count")
        ax3.set_title("Linguistic Indicators")

        ax4 = axes[1, 1]
        advanced_result = results["raw_results"]["advanced"]
        sorted_probs    = sorted(advanced_result.all_probabilities.items(), key=lambda x: x[1], reverse=True)[:8]
        if sorted_probs:
            emotions_adv, probs_adv = zip(*sorted_probs)
            colors_f = ["#e74c3c" if i == 0 else "#95a5a6" for i in range(len(emotions_adv))]
            ax4.barh(range(len(emotions_adv)), probs_adv, color=colors_f, alpha=0.7)
            ax4.set_yticks(range(len(emotions_adv)))
            ax4.set_yticklabels(emotions_adv)
            ax4.set_xlabel("Probability")
            ax4.set_title("Emotion Distribution (Advanced Model)")
            ax4.invert_yaxis()

        plt.tight_layout()

        if save_dir:
            os.makedirs(save_dir, exist_ok=True)
            save_path = os.path.join(save_dir, "ensemble_analysis.png")
            plt.savefig(save_path, dpi=300, bbox_inches="tight")
            print(f"Visualization saved to {save_path}")

        plt.show()


# ==================== DATA PREPROCESSING ====================

def clean_text(text: str) -> str:
    text = re.sub(r"http\S+|www\S+|https\S+", "", text, flags=re.MULTILINE)
    text = re.sub(r"<.*?>", "", text)
    return text.strip()


def preprocess_twitter_emotion_basic():
    """
    Twitter Emotion dataset → 5-class basic emotion classification.
    Classes: anger, fear, joy, sadness, surprise  (20,000 samples)
    Hugging Face dataset: 'dair-ai/emotion'
    """
    print("\n--- Preparing Twitter Emotion Dataset for BASIC Emotion Classification (5 Classes) ---")

    ds    = load_dataset("dair-ai/emotion", split="train")
    df    = ds.to_pandas()

    # dair-ai/emotion label mapping: 0=sadness, 1=joy, 2=love, 3=anger, 4=fear, 5=surprise
    label_map = {0: "sadness", 1: "joy", 2: None, 3: "anger", 4: "fear", 5: "surprise"}

    df["label_text"] = df["label"].map(label_map)
    df = df.dropna(subset=["label_text"])  # drop 'love' which is not in our 5 classes
    df["text"]  = df["text"].apply(clean_text)
    df["label"] = df["label_text"].map(BASIC_LABEL2ID)
    df = df[["text", "label", "label_text"]].dropna()

    print(f"Basic emotion classes: {BASIC_EMOTIONS}")
    print(f"Total samples: {len(df)} | distribution: {df['label_text'].value_counts().to_dict()}")

    return df, BASIC_LABEL2ID, BASIC_ID2LABEL


def preprocess_go_emotions_advanced():
    """
    GoEmotions → 28-class fine-grained emotion classification.
    Uses the standard 80/10/10 train/dev/test splits (54,263 samples).
    """
    print("\n--- Preparing GoEmotions Dataset for ADVANCED Emotion Classification (28 Classes) ---")

    splits = {}
    for split in ["train", "validation", "test"]:
        ds          = load_dataset("google-research-datasets/go_emotions", "simplified", split=split)
        df          = ds.to_pandas()
        label_names = ds.features["labels"].feature.names

        def get_advanced(row):
            for lid in row["labels"]:
                label = label_names[lid]
                if label in ADVANCED_LABEL2ID:
                    return label
            return None

        df["label_text"] = df.apply(get_advanced, axis=1)
        df               = df.dropna(subset=["label_text"])
        df["text"]       = df["text"].apply(clean_text)
        df["label"]      = df["label_text"].map(ADVANCED_LABEL2ID)
        splits[split]    = df[["text", "label", "label_text"]].dropna()

    print(f"Advanced emotion classes (28): {ADVANCED_EMOTIONS[:8]}...")
    for split, df in splits.items():
        print(f"  {split}: {len(df)} samples")

    return splits, ADVANCED_LABEL2ID, ADVANCED_ID2LABEL


def preprocess_tweeteval_sentiment():
    """
    TweetEval sentiment → 3-class sentiment (negative, neutral, positive).
    Dataset: 'tweet_eval' / 'sentiment' (59,899 samples)
    Labels: 0=negative, 1=neutral, 2=positive
    """
    print("\n--- Preparing TweetEval Dataset for SENTIMENT Analysis (3 Classes) ---")

    tweeteval_map = {0: "negative", 1: "neutral", 2: "positive"}

    splits = {}
    for split in ["train", "validation", "test"]:
        ds           = load_dataset("tweet_eval", "sentiment", split=split)
        df           = ds.to_pandas()
        df["label_text"] = df["label"].map(tweeteval_map)
        df           = df.dropna(subset=["label_text"])
        df["text"]   = df["text"].apply(clean_text)
        df["label"]  = df["label_text"].map(SENTIMENT_LABEL2ID)
        splits[split] = df[["text", "label", "label_text"]].dropna()

    print(f"Sentiment classes: {SENTIMENT_LABELS}")
    for split, df in splits.items():
        print(f"  {split}: {len(df)} samples | distribution: {df['label_text'].value_counts().to_dict()}")

    return splits, SENTIMENT_LABEL2ID, SENTIMENT_ID2LABEL


def df_to_hf_dataset(df: pd.DataFrame) -> DatasetDict:
    """Split a single DataFrame into train/val/test HF DatasetDict."""
    train_df, temp_df = train_test_split(df, test_size=0.2, random_state=42, stratify=df["label"])
    val_df,   test_df = train_test_split(temp_df, test_size=0.5, random_state=42, stratify=temp_df["label"])
    return DatasetDict({
        "train":      Dataset.from_pandas(train_df, preserve_index=False),
        "validation": Dataset.from_pandas(val_df,   preserve_index=False),
        "test":       Dataset.from_pandas(test_df,  preserve_index=False),
    })


def splits_to_hf_dataset(splits: Dict[str, pd.DataFrame]) -> DatasetDict:
    """Convert pre-split dict of DataFrames to HF DatasetDict."""
    return DatasetDict({
        "train":      Dataset.from_pandas(splits["train"],      preserve_index=False),
        "validation": Dataset.from_pandas(splits["validation"], preserve_index=False),
        "test":       Dataset.from_pandas(splits["test"],       preserve_index=False),
    })


# ==================== METRICS ====================

def compute_metrics(p):
    preds  = np.argmax(p.predictions, axis=1)
    labels = p.label_ids

    try:
        softmax_preds = torch.nn.functional.softmax(
            torch.from_numpy(p.predictions), dim=-1
        ).numpy()
    except Exception:
        exp_logits    = np.exp(p.predictions - np.max(p.predictions, axis=1, keepdims=True))
        softmax_preds = exp_logits / exp_logits.sum(axis=1, keepdims=True)

    precision, recall, f1, _ = precision_recall_fscore_support(labels, preds, average="macro")
    acc = accuracy_score(labels, preds)

    num_labels = softmax_preds.shape[1]
    if num_labels == 2:
        auc_roc = roc_auc_score(labels, softmax_preds[:, 1])
    else:
        auc_roc = roc_auc_score(labels, softmax_preds, multi_class="ovr", average="macro")

    log_loss_val = log_loss(labels, softmax_preds)

    return {
        "accuracy":  acc,
        "f1":        f1,
        "precision": precision,
        "recall":    recall,
        "auc_roc":   auc_roc,
        "log_loss":  log_loss_val,
    }


def plot_confusion_matrix(labels, preds, class_names, title: str):
    cm = confusion_matrix(labels, preds)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
                xticklabels=class_names, yticklabels=class_names)
    plt.title(title)
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()
    filename = title.lower().replace(" ", "_") + ".png"
    plt.savefig(filename, dpi=300, bbox_inches="tight")
    print(f"Confusion matrix saved to {filename}")
    plt.show()


# ==================== TRAINING ====================

def train_model(
    dataset: DatasetDict,
    label2id: Dict[str, int],
    id2label: Dict[int, str],
    model_name: str,
    model_checkpoint: str,
) -> str:
    print(f"\n{'=' * 20} TRAINING MODEL: {model_name.upper()} {'=' * 20}")

    tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)

    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            padding=False,
            max_length=MAX_SEQ_LENGTH,
        )

    tokenized_datasets = dataset.map(tokenize_function, batched=True)
    data_collator      = DataCollatorWithPadding(tokenizer=tokenizer)

    model = AutoModelForSequenceClassification.from_pretrained(
        model_checkpoint,
        num_labels=len(label2id),
        label2id=label2id,
        id2label=id2label,
        ignore_mismatched_sizes=True,
    ).to(device)

    # Freeze all layers; unfreeze only the final transformer layer + classifier
    for param in model.parameters():
        param.requires_grad = False
    if hasattr(model, "roberta"):
        for param in model.roberta.encoder.layer[-1].parameters():
            param.requires_grad = True
    elif hasattr(model, "deberta"):
        for param in model.deberta.encoder.layer[-1].parameters():
            param.requires_grad = True
    for param in model.classifier.parameters():
        param.requires_grad = True

    trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"Final transformer layer + classifier unfrozen. Trainable params: {trainable:,}")

    output_dir  = f"./results_{model_name}"
    logging_dir = f"./logs_{model_name}"
    os.makedirs(output_dir,  exist_ok=True)
    os.makedirs(logging_dir, exist_ok=True)

    training_args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=NUM_EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRAD_ACCUM_STEPS,
        warmup_steps=500,
        weight_decay=0.01,
        learning_rate=LEARNING_RATE,
        logging_dir=logging_dir,
        logging_strategy="epoch",
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        report_to="none",
        fp16=USE_FP16,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_datasets["train"],
        eval_dataset=tokenized_datasets["validation"],
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=compute_metrics,
    )

    print("\n--- Starting Training ---")
    trainer.train()
    print("\n--- Training Finished ---")

    print("\n--- Evaluating on Test Set ---")
    test_results = trainer.evaluate(eval_dataset=tokenized_datasets["test"])
    for key, value in test_results.items():
        print(f"  {key}: {value:.4f}" if isinstance(value, float) else f"  {key}: {value}")

    test_predictions = trainer.predict(tokenized_datasets["test"])
    preds            = np.argmax(test_predictions.predictions, axis=1)
    class_names      = [id2label[i] for i in range(len(id2label))]
    plot_confusion_matrix(
        test_predictions.label_ids,
        preds,
        class_names,
        f"Confusion Matrix – {model_name} (Test Set)",
    )

    best_model_path = f"./models/{model_name}_best"
    os.makedirs(best_model_path, exist_ok=True)
    trainer.save_model(best_model_path)
    print(f"\nBest model saved to {best_model_path}")

    return best_model_path


# ==================== MAIN ====================

if __name__ == "__main__":
    # 1. BASIC EMOTION MODEL (EmoRoBERTa-X, Twitter Emotion, 5 classes)
    df_basic, label2id_basic, id2label_basic = preprocess_twitter_emotion_basic()
    ds_basic = df_to_hf_dataset(df_basic)
    best_basic = train_model(ds_basic, label2id_basic, id2label_basic,
                             "basic_emotion", EMORO_CHECKPOINT)

    # 2. ADVANCED EMOTION MODEL (EmoRoBERTa-X, GoEmotions, 28 classes)
    adv_splits, label2id_adv, id2label_adv = preprocess_go_emotions_advanced()
    ds_advanced = splits_to_hf_dataset(adv_splits)
    best_advanced = train_model(ds_advanced, label2id_adv, id2label_adv,
                                "advanced_emotion", EMORO_CHECKPOINT)

    # 3. SENTIMENT MODEL (DeBERTa, TweetEval, 3 classes)
    sent_splits, label2id_sent, id2label_sent = preprocess_tweeteval_sentiment()
    ds_sentiment = splits_to_hf_dataset(sent_splits)
    best_sentiment = train_model(ds_sentiment, label2id_sent, id2label_sent,
                                 "sentiment", SENTIMENT_CHECKPOINT)

    print("\n" + "=" * 20 + " ALL MODELS TRAINED. DEMO INFERENCE. " + "=" * 20)

    pipe_basic = pipeline(
        "text-classification", model=best_basic,
        device=0 if device.type == "cuda" else -1,
    )
    pipe_advanced = pipeline(
        "text-classification", model=best_advanced,
        device=0 if device.type == "cuda" else -1,
    )
    pipe_sentiment = pipeline(
        "text-classification", model=best_sentiment,
        device=0 if device.type == "cuda" else -1,
    )

    test_texts = [
        "I can't believe we managed to finish the project on time, I am so relieved!",
        "The service at this restaurant was absolutely horrendous.",
        "That was a surprisingly clever and unexpected plot twist in the movie.",
    ]

    for text in test_texts:
        print(f"\n--- PIPELINE ANALYSIS: '{text}' ---")
        b = pipe_basic(text)[0]
        a = pipe_advanced(text)[0]
        s = pipe_sentiment(text)[0]
        print(f"Basic Emotion    : {b['label']} (Score: {b['score']:.4f})")
        print(f"Advanced Emotion : {a['label']} (Score: {a['score']:.4f})")
        print(f"Sentiment        : {s['label']} (Score: {s['score']:.4f})")

    # ENSEMBLE + EXPLAINABLE DEMO
    analyzer = EnsembleTextEmotionAnalyzer(best_basic, best_advanced, best_sentiment)

    demo_text = "I'm so excited about this! This is absolutely amazing and wonderful!"
    results   = analyzer.analyze(demo_text)

    print("\n" + results["explanation"])
    print("\nRaw predictions:", results["predictions"])

    analyzer.visualize_ensemble(results, save_dir="./viz")
    analyzer.basic_model.visualize_attention(
        results["raw_results"]["basic"],
        save_path="./viz/basic_attention.png",
    )

    print("\nPipeline complete.")
