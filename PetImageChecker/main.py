import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from tensorflow.keras.applications.mobilenet_v2 import MobileNetV2, preprocess_input, decode_predictions

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

# Setup simple logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global model variable
model = None


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, object]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    answer: str
    model: str | None = None
    reasoning_details: object | None = None


class LLMAdvisor:
    def __init__(self):
        self.api_key = (
            os.getenv("OPENROUTER_API_KEY", "").strip()
            or os.getenv("OPENAI_API_KEY", "").strip()
        )
        self.base_url = os.getenv("OPENAI_BASE_URL", "").strip()

        if not self.base_url and self.api_key:
            self.base_url = "https://openrouter.ai/api/v1"

        self.model = os.getenv("OPENAI_MODEL", "tencent/hy3:free").strip() or "tencent/hy3:free"

        self.enabled = bool(self.api_key and OpenAI is not None)

        if self.enabled:
            client_kwargs = {"api_key": self.api_key}

            if self.base_url:
                client_kwargs["base_url"] = self.base_url

            if "openrouter.ai" in self.base_url:
                client_kwargs["default_headers"] = {
                    "HTTP-Referer": "https://pethub.local",
                    "X-Title": "PetHub",
                }

            self._client = OpenAI(**client_kwargs)
        else:
            self._client = None

    def generate(self, message: str, history: list[dict[str, object]] | None = None) -> dict[str, object]:
        clean_message = (message or "").strip()
        clean_history = history or []

        if not clean_message:
            raise HTTPException(status_code=400, detail="Message is required.")

        if not self.enabled:
            raise HTTPException(status_code=503, detail="LLM client is not configured.")

        messages = [
            {
                "role": "system",
                "content": (
                    "You are a professional veterinary assistant for PetHub. "
                    "Always explain that this is not a confirmed diagnosis. "
                    "Give concise, practical advice and include urgent warning signs when relevant."
                ),
            },
        ]

        for item in clean_history[-10:]:
            role = (item.get("role") or "user").strip()
            content = (item.get("content") or "").strip()
            reasoning_details = item.get("reasoning_details")
            if content:
                history_message = {"role": role, "content": content}
                if role == "assistant" and reasoning_details is not None:
                    history_message["reasoning_details"] = reasoning_details
                messages.append(history_message)

        messages.append({"role": "user", "content": clean_message})

        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=messages,
                extra_body={"reasoning": {"enabled": True}},
            )
            assistant_message = response.choices[0].message if response.choices else None
            answer = assistant_message.content if assistant_message else ""
            return {
                "answer": answer or "No response returned by the model.",
                "model": self.model,
                "reasoning_details": getattr(assistant_message, "reasoning_details", None) if assistant_message else None,
            }
        except Exception as exc:
            logger.exception("LLM request failed")
            raise HTTPException(status_code=502, detail=f"LLM request failed: {str(exc)}")


advisor = LLMAdvisor()

BREEDS = {
    "Dog": [
        "Local",
        "German Shepherd",
        "Retriever",
        "Boxer",
        "Rottweiler",
        "Doberman Pinscher",
        "Pomeranian",
        "Shih Tzu",
        "Beagle",
    ],
    "Cat": [
        "Local Cats",
        "Persian Cat",
        "Siamese Cat",
        "British Shorthair",
        "Bengal Cat",
    ],
}

BREED_ALIASES = {
    "Dog": {
        "Local": ["dog", "mixed breed", "mutt", "mongrel"],
        "German Shepherd": ["german shepherd"],
        "Retriever": ["retriever", "golden retriever", "labrador retriever"],
        "Boxer": ["boxer"],
        "Rottweiler": ["rottweiler"],
        "Doberman Pinscher": ["doberman", "doberman pinscher"],
        "Pomeranian": ["pomeranian"],
        "Shih Tzu": ["shih tzu"],
        "Beagle": ["beagle"],
    },
    "Cat": {
        "Local Cats": ["cat", "tabby", "tiger cat", "egyptian cat", "domestic cat"],
        "Persian Cat": ["persian cat"],
        "Siamese Cat": ["siamese cat"],
        "British Shorthair": ["british shorthair"],
        "Bengal Cat": ["bengal cat"],
    },
}

PET_TYPE_KEYWORDS = {
    "Dog": ["dog", "retriever", "shepherd", "hound", "terrier", "pug", "poodle", "beagle", "rottweiler", "doberman", "pomeranian", "shih tzu", "husky"],
    "Cat": ["cat", "tabby", "tiger cat", "persian cat", "siamese cat", "british shorthair", "bengal cat"],
}


def _normalize_label(label: str) -> str:
    return label.lower().replace("_", " ").strip()


def _detect_pet_type(predictions):
    for _, label, _ in predictions:
        normalized = _normalize_label(label)
        for pet_type, keywords in PET_TYPE_KEYWORDS.items():
            if any(keyword in normalized for keyword in keywords):
                return pet_type
    return None


def _suggest_breed(pet_type: str, predictions):
    breed_aliases = BREED_ALIASES[pet_type]

    for _, label, _ in predictions:
        normalized = _normalize_label(label)
        for breed_name, aliases in breed_aliases.items():
            if any(alias in normalized for alias in aliases):
                return breed_name

    return BREEDS[pet_type][0]


def _prepare_image(contents: bytes) -> np.ndarray:
    image_array = np.frombuffer(contents, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

    if image is None:
        raise HTTPException(status_code=400, detail="Unable to read the uploaded image.")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image = cv2.resize(image, (224, 224))
    image = preprocess_input(image.astype(np.float32))
    image = np.expand_dims(image, axis=0)
    return image

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model
    logger.info("Loading MobileNetV2 model...")
    model = MobileNetV2(weights="imagenet")
    logger.info("MobileNetV2 model loaded successfully.")
    yield
    # Clean up if needed
    model = None

app = FastAPI(
    title="Pet Image Verification API",
    description="An API to detect whether an uploaded image is a dog or cat and suggest a likely breed.",
    version="1.0.0",
    lifespan=lifespan
)


@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(payload: ChatRequest):
    """Send a chat message to OpenRouter/OpenAI and return the assistant response."""
    result = advisor.generate(payload.message, payload.history)
    return ChatResponse(
        answer=result["answer"],
        model=result.get("model"),
        reasoning_details=result.get("reasoning_details"),
    )

@app.post("/verify-pet-image")
async def verify_pet_image(file: UploadFile = File(...)):
    """
    Upload an image file and detect whether it is a dog or a cat.
    Returns a pet type and a best-effort breed suggestion.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File provided is not an image.")

    try:
        contents = await file.read()

        global model
        if model is None:
            raise HTTPException(status_code=500, detail="Model is not loaded.")

        image = _prepare_image(contents)
        predictions = model.predict(image, verbose=0)
        decoded_predictions = decode_predictions(predictions, top=5)[0]
        top_predictions = [
            (class_id, label, float(score))
            for class_id, label, score in decoded_predictions
        ]

        pet_type = _detect_pet_type(top_predictions)

        if pet_type is None:
            return JSONResponse({
                "is_valid": False,
                "pet_type": None,
                "breed": None,
                "breed_options": [],
                "predictions": [
                    {"label": label, "confidence": round(score * 100, 2)}
                    for _, label, score in top_predictions
                ],
                "message": "No cat or dog detected.",
            })

        breed = _suggest_breed(pet_type, top_predictions)

        return JSONResponse({
            "is_valid": True,
            "pet_type": pet_type,
            "breed": breed,
            "breed_options": BREEDS[pet_type],
            "predictions": [
                {"label": label, "confidence": round(score * 100, 2)}
                for _, label, score in top_predictions
            ],
            "message": f"{pet_type} detected. Suggested breed: {breed}.",
        })

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

@app.get("/health")
async def health_check():
    """Simple healthcheck endpoint."""
    return {
        "status": "ok",
        "llm_enabled": advisor.enabled,
        "llm_model": advisor.model if advisor.enabled else None,
    }
