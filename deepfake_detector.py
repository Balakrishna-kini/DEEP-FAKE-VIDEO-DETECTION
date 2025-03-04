import os
import cv2
import numpy as np
from keras._tf_keras.keras.models import load_model as keras_load_model
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def preprocess_frame(frame):
    try:
        # Convert BGR to RGB
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        # Resize to expected input size
        frame = cv2.resize(frame, (224, 224))
        # Normalize
        return frame / 255.0
    except Exception as e:
        logger.error(f"Error in preprocess_frame: {str(e)}")
        raise

def load_model(model_path):
    try:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
            
        # Load model with custom_objects set to None to avoid recursion
        model = keras_load_model(model_path, compile=False)
        model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
        
        logger.info(f"Model loaded successfully from {model_path}")
        return model
    except Exception as e:
        logger.error(f"Error loading model: {str(e)}")
        raise

def process_video(video_path, model):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError("Error opening video file")

    frames_buffer = []
    predictions = []
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break
                
            # Preprocess frame
            processed_frame = preprocess_frame(frame)
            frames_buffer.append(processed_frame)
            
            # When we have 10 frames, make a prediction
            if len(frames_buffer) == 10:
                frames_array = np.array(frames_buffer)
                frames_array = np.expand_dims(frames_array, axis=0)  # Add batch dimension
                
                try:
                    # Get prediction
                    prediction = model.predict(frames_array, verbose=0)[0][0]
                    if not np.isnan(prediction):
                        predictions.append(float(prediction))
                except Exception as e:
                    logger.warning(f"Error processing batch: {str(e)}")
                
                # Clear buffer but keep last frame for overlap
                frames_buffer = frames_buffer[-1:]

        # Process any remaining frames if we have at least 2
        if len(frames_buffer) > 1:
            # Pad to 10 frames if necessary
            while len(frames_buffer) < 10:
                frames_buffer.append(frames_buffer[-1])
            
            frames_array = np.array(frames_buffer)
            frames_array = np.expand_dims(frames_array, axis=0)
            
            try:
                prediction = model.predict(frames_array, verbose=0)[0][0]
                if not np.isnan(prediction):
                    predictions.append(float(prediction))
            except Exception as e:
                logger.warning(f"Error processing final batch: {str(e)}")

        if not predictions:
            raise ValueError("No valid predictions could be made from the video")

        # Return average prediction
        final_prediction = float(np.mean(predictions))
        
        # Ensure the prediction is valid
        if np.isnan(final_prediction):
            raise ValueError("Invalid prediction value")
            
        return final_prediction
    except Exception as e:
        logger.error(f"Error processing video: {str(e)}")
        raise
    finally:
        cap.release()