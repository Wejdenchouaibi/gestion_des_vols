from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
from bson.objectid import ObjectId
import jwt
import datetime
import os
from dateutil.relativedelta import relativedelta

app = Flask(__name__)
CORS(app)  # Enable CORS for Angular frontend

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['tunisair_db']
users_collection = db['users']
flights_collection = db['flights']
planes_collection = db['planes']
crews_collection = db['crews']
promotions_collection = db['promotions']
reservations_collection = db['reservations']

# JWT configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key')
API_PREFIX = '/api'

def generate_token(user_id, role, username, firstName=None, lastName=None, email=None):
    payload = {
        'user_id': user_id,
        'role': role,
        'username': username,
        'firstName': firstName,
        'lastName': lastName,
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_token(token):
    try:
        if token.startswith('Bearer '):
            token = token[7:]
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@app.route(f'{API_PREFIX}/register', methods=['POST'])
def register():
    try:
        data = request.json
        firstName = data.get('firstName', '').strip()
        lastName = data.get('lastName', '').strip()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', 'client').strip()

        # Validate all fields are provided and not empty
        if not all([firstName, lastName, username, email, password, role]):
            return jsonify({'success': False, 'message': 'Tous les champs sont requis'}), 400

        if role != 'client':
            return jsonify({'success': False, 'message': 'Seuls les clients peuvent s\'inscrire via ce formulaire'}), 400

        # Check if username or email already exists
        existing_user = users_collection.find_one({'$or': [{'username': username}, {'email': email}]})
        if existing_user:
            if existing_user['username'] == username:
                return jsonify({'success': False, 'message': 'Nom d\'utilisateur déjà pris'}), 409
            else:
                return jsonify({'success': False, 'message': 'Email déjà utilisé'}), 409

        hashed_password = generate_password_hash(password)
        user = {
            'firstName': firstName,
            'lastName': lastName,
            'username': username,
            'email': email,
            'password': hashed_password,
            'role': role
        }
        result = users_collection.insert_one(user)
        token = generate_token(str(result.inserted_id), role, username, firstName, lastName, email)
        user_response = {
            '_id': str(result.inserted_id),
            'firstName': firstName,
            'lastName': lastName,
            'username': username,
            'email': email,
            'role': role
        }
        return jsonify({
            'success': True,
            'user': user_response,
            'token': token,
            'message': 'Compte créé avec succès'
        }), 201
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'success': False, 'message': f'Erreur lors de l\'inscription: {str(e)}'}), 500

@app.route(f'{API_PREFIX}/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        return jsonify({'success': False, 'message': 'Nom d\'utilisateur et mot de passe requis'}), 400

    if username == 'admin' and password == 'admin123':
        user_response = {
            '_id': 'admin',
            'username': 'admin',
            'role': 'admin',
            'firstName': 'Admin',
            'lastName': 'User',
            'email': 'admin@tunisair.com'
        }
        token = generate_token('admin', 'admin', 'admin', 'Admin', 'User', 'admin@tunisair.com')
        return jsonify({
            'success': True,
            'user': user_response,
            'token': token,
            'message': 'Connexion admin réussie'
        }), 200

    user = users_collection.find_one({'username': username})
    if not user or not check_password_hash(user['password'], password):
        return jsonify({'success': False, 'message': 'Nom d\'utilisateur ou mot de passe incorrect'}), 401

    token = generate_token(str(user['_id']), user['role'], user['username'], user.get('firstName'), user.get('lastName'), user.get('email'))
    user_response = {
        '_id': str(user['_id']),
        'firstName': user.get('firstName'),
        'lastName': user.get('lastName'),
        'username': user['username'],
        'email': user.get('email'),
        'role': user['role']
    }
    return jsonify({
        'success': True,
        'user': user_response,
        'token': token,
        'message': 'Connexion réussie'
    }), 200

@app.route(f'{API_PREFIX}/validate-token', methods=['GET'])
def validate_token():
    """
    Validates the provided JWT token and returns user information if valid.
    """
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload:
        return jsonify({'success': False, 'message': 'Token invalide ou expiré'}), 401

    user_id = payload['user_id']
    username = payload['username']
    role = payload['role']

    if user_id == 'admin' and username == 'admin':
        user_response = {
            '_id': 'admin',
            'username': 'admin',
            'role': 'admin',
            'firstName': payload.get('firstName', 'Admin'),
            'lastName': payload.get('lastName', 'User'),
            'email': payload.get('email', 'admin@tunisair.com')
        }
        return jsonify({'success': True, 'user': user_response}), 200

    user = users_collection.find_one({'_id': ObjectId(user_id)})
    if not user:
        return jsonify({'success': False, 'message': 'Utilisateur non trouvé'}), 404

    user_response = {
        '_id': str(user['_id']),
        'firstName': user.get('firstName'),
        'lastName': user.get('lastName'),
        'username': user['username'],
        'email': user.get('email'),
        'role': user['role']
    }
    return jsonify({'success': True, 'user': user_response}), 200

@app.route(f'{API_PREFIX}/flights', methods=['GET'])
def get_flights():
    query = {}
    departure = request.args.get('departure')
    arrival = request.args.get('arrival')
    date = request.args.get('date')
    price = request.args.get('price')
    flight_class = request.args.get('class')
    company = request.args.get('company')
    duration = request.args.get('duration')
    escales = request.args.get('escales')
    flight_id = request.args.get('flight_id')

    if departure:
        query['departure'] = departure
    if arrival:
        query['arrival'] = arrival
    if date:
        query['schedule'] = {'$regex': f'^{date}', '$options': 'i'}  # Match date part of ISO string
    if price:
        query['price_numeric'] = {'$lte': float(price)}
    if flight_class:
        query['class'] = flight_class
    if company:
        query['company'] = {'$regex': company, '$options': 'i'}
    if duration:
        query['duration'] = {'$lte': float(duration)}
    if escales:
        query['escales'] = escales
    if flight_id:
        query['_id'] = ObjectId(flight_id)

    flights = list(flights_collection.find(query))
    flights_response = [{
        '_id': str(flight['_id']),
        'number': flight['number'],
        'departure': flight['departure'],
        'arrival': flight['arrival'],
        'plane': flight.get('plane', ''),
        'crew': flight.get('crew', ''),
        'schedule': flight['schedule'],
        'price': flight['price'],
        'price_numeric': flight.get('price_numeric', 0),
        'promotion': flight.get('promotion', ''),
        'status': flight['status'],
        'class': flight.get('class', 'economique'),
        'company': flight.get('company', 'Tunisair'),
        'duration': flight.get('duration', 0),
        'escales': flight.get('escales', '0'),
        'passengers': flight.get('passengers', 0),
        'capacity': flight.get('capacity', 0)
    } for flight in flights]
    return jsonify({'success': True, 'flights': flights_response}), 200

@app.route(f'{API_PREFIX}/flights', methods=['POST'])
def add_flight():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['number', 'departure', 'arrival', 'plane', 'crew', 'schedule', 'price', 'status']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    try:
        price_numeric = float(data['price'].split()[0])  # Extract numeric part (e.g., "150 €" -> 150)
    except (ValueError, IndexError):
        price_numeric = 0

    flight = {
        'number': data['number'],
        'departure': data['departure'],
        'arrival': data['arrival'],
        'plane': data['plane'],
        'crew': data['crew'],
        'schedule': data['schedule'],
        'price': data['price'],
        'price_numeric': price_numeric,
        'promotion': data.get('promotion', ''),
        'status': data['status'],
        'date': data.get('date', datetime.datetime.utcnow().isoformat()),
        'passengers': data.get('passengers', 0),
        'capacity': data.get('capacity', 0),
        'class': data.get('class', 'economique'),
        'company': data.get('company', 'Tunisair'),
        'duration': data.get('duration', 0),
        'escales': data.get('escales', '0')
    }
    result = flights_collection.insert_one(flight)
    flight['_id'] = str(result.inserted_id)
    return jsonify({'success': True, 'flight': flight, 'message': 'Vol ajouté avec succès'}), 201

@app.route(f'{API_PREFIX}/flights/<id>', methods=['PUT'])
def update_flight(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['number', 'departure', 'arrival', 'plane', 'crew', 'schedule', 'price', 'status']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    try:
        price_numeric = float(data['price'].split()[0])  # Extract numeric part
    except (ValueError, IndexError):
        price_numeric = 0

    flight = {
        'number': data['number'],
        'departure': data['departure'],
        'arrival': data['arrival'],
        'plane': data['plane'],
        'crew': data['crew'],
        'schedule': data['schedule'],
        'price': data['price'],
        'price_numeric': price_numeric,
        'promotion': data.get('promotion', ''),
        'status': data['status'],
        'date': data.get('date'),
        'passengers': data.get('passengers', 0),
        'capacity': data.get('capacity', 0),
        'class': data.get('class', 'economique'),
        'company': data.get('company', 'Tunisair'),
        'duration': data.get('duration', 0),
        'escales': data.get('escales', '0')
    }
    result = flights_collection.update_one({'_id': ObjectId(id)}, {'$set': flight})
    if result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Vol non trouvé'}), 404

    flight['_id'] = id
    return jsonify({'success': True, 'flight': flight, 'message': 'Vol modifié avec succès'}), 200

@app.route(f'{API_PREFIX}/flights/<id>', methods=['DELETE'])
def delete_flight(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    result = flights_collection.delete_one({'_id': ObjectId(id)})
    if result.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Vol non trouvé'}), 404

    return jsonify({'success': True, 'message': 'Vol supprimé avec succès'}), 200

@app.route(f'{API_PREFIX}/planes', methods=['GET'])
def get_planes():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    query = {}
    model = request.args.get('model')
    registration = request.args.get('registration')
    available = request.args.get('available')

    if model:
        query['model'] = {'$regex': model, '$options': 'i'}
    if registration:
        query['registration'] = {'$regex': registration, '$options': 'i'}
    if available:
        query['available'] = available.lower() == 'true'

    planes = list(planes_collection.find(query))
    planes_response = [{
        '_id': str(plane['_id']),
        'model': plane['model'],
        'registration': plane['registration'],
        'capacity': plane['capacity'],
        'available': plane['available']
    } for plane in planes]
    return jsonify({'success': True, 'planes': planes_response}), 200

@app.route(f'{API_PREFIX}/planes', methods=['POST'])
def add_plane():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['model', 'registration', 'capacity', 'available']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    plane = {
        'model': data['model'],
        'registration': data['registration'],
        'capacity': data['capacity'],
        'available': data['available']
    }
    result = planes_collection.insert_one(plane)
    plane['_id'] = str(result.inserted_id)
    return jsonify({'success': True, 'plane': plane, 'message': 'Avion ajouté avec succès'}), 201

@app.route(f'{API_PREFIX}/planes/<id>', methods=['PUT'])
def update_plane(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['model', 'registration', 'capacity', 'available']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    plane = {
        'model': data['model'],
        'registration': data['registration'],
        'capacity': data['capacity'],
        'available': data['available']
    }
    result = planes_collection.update_one({'_id': ObjectId(id)}, {'$set': plane})
    if result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Avion non trouvé'}), 404

    plane['_id'] = id
    return jsonify({'success': True, 'plane': plane, 'message': 'Avion modifié avec succès'}), 200

@app.route(f'{API_PREFIX}/planes/<id>', methods=['DELETE'])
def delete_plane(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    result = planes_collection.delete_one({'_id': ObjectId(id)})
    if result.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Avion non trouvé'}), 404

    return jsonify({'success': True, 'message': 'Avion supprimé avec succès'}), 200

@app.route(f'{API_PREFIX}/crews', methods=['GET'])
def get_crews():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    query = {}
    name = request.args.get('name')
    main_role = request.args.get('mainRole')
    available = request.args.get('available')

    if name:
        query['name'] = {'$regex': name, '$options': 'i'}
    if main_role:
        query['mainRole'] = {'$regex': main_role, '$options': 'i'}
    if available:
        query['available'] = available.lower() == 'true'

    crews = list(crews_collection.find(query))
    crews_response = [{
        '_id': str(crew['_id']),
        'name': crew['name'],
        'members': crew['members'],
        'mainRole': crew['mainRole'],
        'available': crew['available']
    } for crew in crews]
    return jsonify({'success': True, 'crews': crews_response}), 200

@app.route(f'{API_PREFIX}/crews', methods=['POST'])
def add_crew():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['name', 'mainRole', 'members', 'available']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    crew = {
        'name': data['name'],
        'members': data['members'],
        'mainRole': data['mainRole'],
        'available': data['available']
    }
    result = crews_collection.insert_one(crew)
    crew['_id'] = str(result.inserted_id)
    return jsonify({'success': True, 'crew': crew, 'message': 'Équipage ajouté avec succès'}), 201

@app.route(f'{API_PREFIX}/crews/<id>', methods=['PUT'])
def update_crew(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['name', 'mainRole', 'members', 'available']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    crew = {
        'name': data['name'],
        'members': data['members'],
        'mainRole': data['mainRole'],
        'available': data['available']
    }
    result = crews_collection.update_one({'_id': ObjectId(id)}, {'$set': crew})
    if result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Équipage non trouvé'}), 404

    crew['_id'] = id
    return jsonify({'success': True, 'crew': crew, 'message': 'Équipage modifié avec succès'}), 200

@app.route(f'{API_PREFIX}/crews/<id>', methods=['DELETE'])
def delete_crew(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    result = crews_collection.delete_one({'_id': ObjectId(id)})
    if result.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Équipage non trouvé'}), 404

    return jsonify({'success': True, 'message': 'Équipage supprimé avec succès'}), 200

@app.route(f'{API_PREFIX}/promotions', methods=['GET'])
def get_promotions():
    promotions = list(promotions_collection.find())
    promotions_response = [{
        '_id': str(promo['_id']),
        'destination': promo['destination'],
        'description': promo['description'],
        'image': promo['image'],
        'oldPrice': promo['oldPrice'],
        'newPrice': promo['newPrice'],
        'discount': promo['discount']
    } for promo in promotions]
    return jsonify({'success': True, 'promotions': promotions_response}), 200

@app.route(f'{API_PREFIX}/promotions', methods=['POST'])
def add_promotion():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['destination', 'description', 'image', 'oldPrice', 'newPrice', 'discount']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    promotion = {
        'destination': data['destination'],
        'description': data['description'],
        'image': data['image'],
        'oldPrice': float(data['oldPrice']),
        'newPrice': float(data['newPrice']),
        'discount': float(data['discount'])
    }
    result = promotions_collection.insert_one(promotion)
    promotion['_id'] = str(result.inserted_id)
    return jsonify({'success': True, 'promotion': promotion, 'message': 'Promotion ajoutée avec succès'}), 201

@app.route(f'{API_PREFIX}/promotions/<id>', methods=['PUT'])
def update_promotion(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    data = request.json
    required_fields = ['destination', 'description', 'image', 'oldPrice', 'newPrice', 'discount']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    promotion = {
        'destination': data['destination'],
        'description': data['description'],
        'image': data['image'],
        'oldPrice': float(data['oldPrice']),
        'newPrice': float(data['newPrice']),
        'discount': float(data['discount'])
    }
    result = promotions_collection.update_one({'_id': ObjectId(id)}, {'$set': promotion})
    if result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Promotion non trouvée'}), 404

    promotion['_id'] = id
    return jsonify({'success': True, 'promotion': promotion, 'message': 'Promotion modifiée avec succès'}), 200

@app.route(f'{API_PREFIX}/promotions/<id>', methods=['DELETE'])
def delete_promotion(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    result = promotions_collection.delete_one({'_id': ObjectId(id)})
    if result.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Promotion non trouvée'}), 404

    return jsonify({'success': True, 'message': 'Promotion supprimée avec succès'}), 200

@app.route(f'{API_PREFIX}/reservations', methods=['POST'])
def create_reservation():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload:
        return jsonify({'success': False, 'message': 'Token invalide ou expiré'}), 401

    data = request.json
    required_fields = ['flight_id', 'passengers', 'class', 'passengers_details']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    if len(data['passengers_details']) != data['passengers']:
        return jsonify({'success': False, 'message': 'Le nombre de passagers ne correspond pas aux détails fournis'}), 400

    for passenger in data['passengers_details']:
        if not all(field in passenger for field in ['name', 'passport_number']):
            return jsonify({'success': False, 'message': 'Chaque passager doit avoir un nom et un numéro de passeport'}), 400

    flight = flights_collection.find_one({'_id': ObjectId(data['flight_id'])})
    if not flight:
        return jsonify({'success': False, 'message': 'Vol non trouvé'}), 404

    available_seats = flight['capacity'] - flight['passengers']
    if data['passengers'] > available_seats:
        return jsonify({'success': False, 'message': 'Pas assez de sièges disponibles'}), 400

    total_price = data['passengers'] * flight['price_numeric']
    if flight.get('promotion'):
        promo = promotions_collection.find_one({'destination': flight['arrival']})
        if promo:
            total_price = data['passengers'] * promo['newPrice']

    reservation = {
        'user_id': payload['user_id'],
        'flight_id': data['flight_id'],
        'passengers': data['passengers'],
        'passengers_details': data['passengers_details'],
        'class': data['class'],
        'total_price': total_price,
        'status': 'confirmed',
        'created_at': datetime.datetime.utcnow().isoformat(),
        'updated_at': datetime.datetime.utcnow().isoformat()
    }
    result = reservations_collection.insert_one(reservation)

    # Update flight passengers
    flights_collection.update_one(
        {'_id': ObjectId(data['flight_id'])},
        {'$inc': {'passengers': data['passengers']}}
    )

    reservation['_id'] = str(result.inserted_id)
    return jsonify({'success': True, 'reservation': reservation, 'message': 'Réservation créée avec succès'}), 201

@app.route(f'{API_PREFIX}/reservations/<id>', methods=['PUT'])
def update_reservation(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload:
        return jsonify({'success': False, 'message': 'Token invalide ou expiré'}), 401

    data = request.json
    required_fields = ['flight_id', 'passengers', 'class', 'passengers_details']
    if not all(data.get(field) for field in required_fields):
        return jsonify({'success': False, 'message': 'Tous les champs requis ne sont pas fournis'}), 400

    if len(data['passengers_details']) != data['passengers']:
        return jsonify({'success': False, 'message': 'Le nombre de passagers ne correspond pas aux détails fournis'}), 400

    for passenger in data['passengers_details']:
        if not all(field in passenger for field in ['name', 'passport_number']):
            return jsonify({'success': False, 'message': 'Chaque passager doit avoir un nom et un numéro de passeport'}), 400

    reservation = reservations_collection.find_one({'_id': ObjectId(id), 'user_id': payload['user_id']})
    if not reservation:
        return jsonify({'success': False, 'message': 'Réservation non trouvée ou non autorisée'}), 404

    flight = flights_collection.find_one({'_id': ObjectId(data['flight_id'])})
    if not flight:
        return jsonify({'success': False, 'message': 'Vol non trouvé'}), 404

    # Calculate available seats, accounting for current reservation
    available_seats = flight['capacity'] - flight['passengers'] + reservation['passengers']
    if data['passengers'] > available_seats:
        return jsonify({'success': False, 'message': 'Pas assez de sièges disponibles'}), 400

    total_price = data['passengers'] * flight['price_numeric']
    if flight.get('promotion'):
        promo = promotions_collection.find_one({'destination': flight['arrival']})
        if promo:
            total_price = data['passengers'] * promo['newPrice']

    updated_reservation = {
        'flight_id': data['flight_id'],
        'passengers': data['passengers'],
        'passengers_details': data['passengers_details'],
        'class': data['class'],
        'total_price': total_price,
        'status': data.get('status', reservation['status']),
        'updated_at': datetime.datetime.utcnow().isoformat()
    }
    result = reservations_collection.update_one(
        {'_id': ObjectId(id)},
        {'$set': updated_reservation}
    )
    if result.matched_count == 0:
        return jsonify({'success': False, 'message': 'Réservation non trouvée'}), 404

    # Update flight passengers
    passenger_diff = data['passengers'] - reservation['passengers']
    flights_collection.update_one(
        {'_id': ObjectId(data['flight_id'])},
        {'$inc': {'passengers': passenger_diff}}
    )

    updated_reservation['_id'] = id
    updated_reservation['user_id'] = reservation['user_id']
    return jsonify({'success': True, 'reservation': updated_reservation, 'message': 'Réservation modifiée avec succès'}), 200

@app.route(f'{API_PREFIX}/reservations/<id>', methods=['DELETE'])
def delete_reservation(id):
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload:
        return jsonify({'success': False, 'message': 'Token invalide ou expiré'}), 401

    reservation = reservations_collection.find_one({'_id': ObjectId(id), 'user_id': payload['user_id']})
    if not reservation:
        return jsonify({'success': False, 'message': 'Réservation non trouvée ou non autorisée'}), 404

    # Update flight passengers
    flights_collection.update_one(
        {'_id': ObjectId(reservation['flight_id'])},
        {'$inc': {'passengers': -reservation['passengers']}}
    )

    result = reservations_collection.delete_one({'_id': ObjectId(id)})
    if result.deleted_count == 0:
        return jsonify({'success': False, 'message': 'Réservation non trouvée'}), 404

    return jsonify({'success': True, 'message': 'Réservation supprimée avec succès'}), 200

@app.route(f'{API_PREFIX}/reservations', methods=['GET'])
def get_reservations():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload:
        return jsonify({'success': False, 'message': 'Token invalide ou expiré'}), 401

    reservations = list(reservations_collection.find({'user_id': payload['user_id']}))
    reservations_response = [{
        '_id': str(res['_id']),
        'user_id': res['user_id'],
        'flight_id': res['flight_id'],
        'passengers': res['passengers'],
        'passengers_details': res.get('passengers_details', []),
        'class': res['class'],
        'total_price': res['total_price'],
        'status': res['status'],
        'created_at': res['created_at'],
        'updated_at': res['updated_at']
    } for res in reservations]
    return jsonify({'success': True, 'reservations': reservations_response}), 200

@app.route(f'{API_PREFIX}/reports', methods=['GET'])
def get_reports():
    token = request.headers.get('Authorization')
    if not token:
        return jsonify({'success': False, 'message': 'Token manquant'}), 401

    payload = verify_token(token)
    if not payload or payload['role'] != 'admin':
        return jsonify({'success': False, 'message': 'Accès non autorisé'}), 403

    period = request.args.get('period', 'this_month')
    query = get_period_query(period)

    # Total flights
    total_flights = flights_collection.count_documents(query)

    # Total passengers
    pipeline_passengers = [
        {"$match": query},
        {"$group": {"_id": None, "total_passengers": {"$sum": "$passengers"}}}
    ]
    passengers_result = list(flights_collection.aggregate(pipeline_passengers))
    total_passengers = passengers_result[0]['total_passengers'] if passengers_result else 0

    # Total revenues
    pipeline_revenues = [
        {"$match": query},
        {
            "$group": {
                "_id": None,
                "total_revenues": {
                    "$sum": {
                        "$multiply": [
                            "$price_numeric",
                            "$passengers"
                        ]
                    }
                }
            }
        }
    ]
    revenues_result = list(flights_collection.aggregate(pipeline_revenues))
    total_revenues = revenues_result[0]['total_revenues'] if revenues_result else 0

    # Occupancy rate
    pipeline_occupancy = [
        {"$match": query},
        {"$group": {"_id": None, "total_passengers": {"$sum": "$passengers"}, "total_capacity": {"$sum": "$capacity"}}}
    ]
    occupancy_result = list(flights_collection.aggregate(pipeline_occupancy))
    total_capacity = occupancy_result[0]['total_capacity'] if occupancy_result else 0
    occupancy_rate = (total_passengers / total_capacity * 100) if total_capacity > 0 else 0

    # Top destinations
    pipeline_top_dest = [
        {"$match": query},
        {"$group": {"_id": "$arrival", "flights": {"$sum": 1}, "passengers": {"$sum": "$passengers"}}},
        {"$sort": {"flights": -1}},
        {"$limit": 3}
    ]
    top_destinations = list(flights_collection.aggregate(pipeline_top_dest))
    top_dest_response = [{
        'destination': dest['_id'],
        'flights': dest['flights'],
        'passengers': dest['passengers']
    } for dest in top_destinations]

    # Flights per month (for chart)
    pipeline_flights_per_month = [
        {"$match": query},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m", "date": {"$toDate": "$date"}}}, "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    flights_per_month = list(flights_collection.aggregate(pipeline_flights_per_month))
    flights_per_month_response = [{"month": month['_id'], "count": month['count']} for month in flights_per_month]

    # Destination distribution (for chart)
    pipeline_dest_dist = [
        {"$match": query},
        {"$group": {"_id": "$arrival", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    dest_dist = list(flights_collection.aggregate(pipeline_dest_dist))
    dest_dist_response = [{"destination": dest['_id'], "count": dest['count']} for dest in dest_dist]

    reports = {
        'total_flights': total_flights,
        'total_passengers': total_passengers,
        'total_revenues': total_revenues,
        'occupancy_rate': round(occupancy_rate, 2),
        'top_destinations': top_dest_response,
        'flights_per_month': flights_per_month_response,
        'destination_distribution': dest_dist_response
    }

    return jsonify({'success': True, 'reports': reports}), 200

@app.route(f'{API_PREFIX}/cities', methods=['GET'])
def get_cities():
    # Fetch unique departure and arrival cities
    pipeline_departures = [
        {"$group": {"_id": "$departure"}},
        {"$sort": {"_id": 1}}
    ]
    pipeline_arrivals = [
        {"$group": {"_id": "$arrival"}},
        {"$sort": {"_id": 1}}
    ]
    departures = [doc['_id'] for doc in flights_collection.aggregate(pipeline_departures) if doc['_id']]
    arrivals = [doc['_id'] for doc in flights_collection.aggregate(pipeline_arrivals) if doc['_id']]
    cities = {
        'departures': sorted(list(set(departures))),
        'arrivals': sorted(list(set(arrivals)))
    }
    return jsonify({'success': True, 'cities': cities}), 200

def get_period_query(period):
    now = datetime.datetime.utcnow()
    if period == 'this_month':
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end = start + relativedelta(months=1)
    elif period == 'last_3_months':
        start = now - relativedelta(months=3)
        end = now
    elif period == 'this_year':
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        end = start + relativedelta(years=1)
    else:
        start = datetime.datetime.min
        end = datetime.datetime.max

    return {'date': {'$gte': start.isoformat(), '$lt': end.isoformat()}}

if __name__ == '__main__':
    app.run(debug=True)