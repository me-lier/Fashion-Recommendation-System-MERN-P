from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import tensorflow as tf
from tensorflow.keras.applications.resnet50 import ResNet50, preprocess_input
from tensorflow.keras.layers import GlobalMaxPooling2D
from tensorflow.keras.preprocessing import image
from sklearn.neighbors import NearestNeighbors
import pickle
from numpy.linalg import norm
import base64
import os
from huggingface_hub import hf_hub_download

app = Flask(__name__)
CORS(app)

# Replace with your Hugging Face repo and model file names
repo_id = "melier/fashion-recommendation-embeddings"

# Download embeddings.pkl and filenames.pkl from Hugging Face Hub
embeddings_path = hf_hub_download(repo_id=repo_id, filename="embeddings.pkl", repo_type="model")
# filenames_path = hf_hub_download(repo_id=repo_id, filename="filenames.pkl", repo_type="model")

# Check if model files are downloaded
if not os.path.exists(embeddings_path) or not os.path.exists("filenames.pkl"):
    raise FileNotFoundError("Required model files not found. Please ensure embeddings.pkl and filenames.pkl exist.")

# Load the model and precomputed features
try:
    model = ResNet50(weights='imagenet', include_top=False, input_shape=(224, 224, 3))
    model.trainable = False
    model = tf.keras.Sequential([model, GlobalMaxPooling2D()])

    feature_list = np.array(pickle.load(open(embeddings_path, 'rb')))
    filenames = pickle.load(open("filenames.pkl", 'rb'))
except Exception as e:
    print(f"Error loading model or features: {str(e)}")
    raise

@app.route('/find-similar', methods=['POST'])
def find_similar():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400

        file = request.files['image']
        if not file:
            return jsonify({'error': 'Empty file provided'}), 400

        # Read and process the uploaded image
        file_bytes = np.frombuffer(file.read(), np.uint8)
        img = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)
        
        if img is None:
            return jsonify({'error': 'Invalid image format or corrupted file'}), 400
            
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Extract features
        img = cv2.resize(img, (224, 224))
        img_array = image.img_to_array(img)
        expanded_img_array = np.expand_dims(img_array, axis=0)
        preprocessed_img = preprocess_input(expanded_img_array)
        result = model.predict(preprocessed_img).flatten()
        normalized_result = result / norm(result)

        # Find similar images
        neighbors = NearestNeighbors(n_neighbors=6, algorithm='brute', metric='euclidean')
        neighbors.fit(feature_list)
        distances, indices = neighbors.kneighbors([normalized_result])

        # Prepare similar images
        similar_images = []
        for idx in indices[0][1:6]:
            img_path = filenames[idx]
            
            if not os.path.exists(img_path):
                print(f"Warning: Image not found at path: {img_path}")
                continue
                
            img = cv2.imread(img_path)
            if img is None:
                print(f"Warning: Could not read image at path: {img_path}")
                continue
                
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            # Remove resize operation to maintain original size
            # Add high-quality encoding parameters
            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 100]  # Highest JPEG quality
            _, buffer = cv2.imencode('.jpg', img, encode_params)
            img_str = base64.b64encode(buffer).decode()
            similar_images.append(img_str)

        if not similar_images:
            return jsonify({'error': 'No similar images found'}), 404

        return jsonify({'similar_images': similar_images})

    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True)