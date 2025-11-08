# Project Structure Documentation

## Overview
This document explains the production-ready folder structure and architecture of the Syncano music streaming application.

## Directory Structure

```
Music/
├── app/                          # Main application package
│   ├── __init__.py              # App factory and initialization
│   ├── routes/                  # Route handlers (blueprints)
│   │   ├── __init__.py
│   │   ├── main.py             # Main routes (index, health)
│   │   └── api.py              # JioSaavn API routes
│   ├── services/                # Business logic layer
│   │   ├── __init__.py
│   │   ├── jiosaavn_service.py # JioSaavn API integration
│   │   └── room_service.py     # Room management logic
│   ├── socketio_handlers/       # WebSocket event handlers
│   │   ├── __init__.py
│   │   └── room_events.py      # Real-time room events
│   └── utils/                   # Utility functions
│       ├── __init__.py
│       ├── helpers.py           # Helper functions (encryption, formatting)
│       └── logger.py            # Logging configuration
├── static/                      # Frontend assets
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── images/
├── templates/                   # HTML templates
│   └── index.html
├── logs/                        # Application logs
│   └── app.log
├── config.py                    # Configuration management
├── run.py                       # Application entry point
├── requirements.txt             # Python dependencies
├── .env.example                 # Environment variables template
└── README.md                    # Main documentation

```

## Architecture Components

### 1. Application Factory (`app/__init__.py`)
- **Purpose**: Creates and configures Flask application
- **Pattern**: Factory pattern for flexible initialization
- **Features**:
  - Environment-based configuration
  - Service initialization
  - Blueprint registration
  - Error handler setup
  - Security headers

### 2. Configuration (`config.py`)
- **Purpose**: Centralized configuration management
- **Environments**:
  - `DevelopmentConfig`: Debug enabled, verbose logging
  - `ProductionConfig`: Security hardened, minimal logging
  - `TestingConfig`: Testing-specific settings
- **Key Settings**:
  - Flask configuration
  - Socket.IO settings
  - JioSaavn API endpoints
  - Logging configuration

### 3. Services Layer (`app/services/`)

#### JioSaavnService
- **Responsibility**: JioSaavn API integration
- **Methods**:
  - `search_songs()`: Search functionality
  - `get_song_details()`: Fetch song information
  - `get_album_details()`: Album data retrieval
  - `get_playlist_details()`: Playlist information
  - `get_lyrics()`: Lyrics fetching
  - `format_song_data()`: Data formatting and URL decryption

#### RoomService
- **Responsibility**: Collaborative room management
- **Methods**:
  - `create_room()`: Room creation
  - `join_room()`: User joining
  - `leave_room()`: User departure handling
  - `update_song()`: Sync song changes
  - `update_playback()`: Sync playback state
  - `update_seek()`: Sync seek position

### 4. Routes (`app/routes/`)

#### Main Routes (`main.py`)
- `GET /`: Application homepage
- `GET /health`: Health check endpoint
- `GET /room/<room_id>`: Room information

#### API Routes (`api.py`)
- `GET /api/search`: Search songs
- `GET /api/song/<song_id>`: Get song details
- `GET /api/album/<album_id>`: Get album info
- `GET /api/playlist/<playlist_id>`: Get playlist info
- `GET /api/lyrics/<song_id>`: Get song lyrics
- `GET /api/test`: API health test

### 5. Socket.IO Handlers (`app/socketio_handlers/`)
- **Events**:
  - `create_room`: Create listening room
  - `join_room`: Join existing room
  - `play_song`: Broadcast song changes
  - `play_pause`: Sync playback state
  - `seek`: Sync seek position
  - `disconnect`: Handle user disconnection

### 6. Utilities (`app/utils/`)

#### Helpers (`helpers.py`)
- `format_string()`: HTML entity replacement
- `decrypt_url()`: JioSaavn URL decryption
- `get_quality_url()`: Audio quality selection
- `get_image_url()`: Image resolution selection
- `clean_json_response()`: JSON formatting

#### Logger (`logger.py`)
- `setup_logger()`: Configure logging system
- `log_request()`: Request logging
- `log_error()`: Error logging with context

## Running the Application

### Development Mode
```bash
python run.py
```

### Production Mode
```bash
FLASK_ENV=production python run.py
```

### Using Gunicorn (Production)
```bash
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:3001 "app:create_app('production')"
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
FLASK_ENV=development
SECRET_KEY=your-secret-key
HOST=0.0.0.0
PORT=3001
LOG_LEVEL=INFO
```

## Benefits of This Structure

### 1. **Separation of Concerns**
- Business logic separated from routes
- Clear responsibility boundaries
- Easy to test individual components

### 2. **Scalability**
- Easy to add new routes/services
- Modular design allows independent updates
- Can split into microservices if needed

### 3. **Maintainability**
- Clear file organization
- Easy to locate specific functionality
- Reduced code duplication

### 4. **Testability**
- Services can be tested independently
- Routes can be tested with mocked services
- Clear interfaces between layers

### 5. **Professional Standards**
- Follows Flask best practices
- Industry-standard structure
- Easy onboarding for new developers

## Development Workflow

### Adding a New Feature

1. **Service Layer**: Implement business logic in `app/services/`
2. **Routes**: Add endpoint in appropriate blueprint
3. **Socket.IO**: Add event handler if real-time needed
4. **Frontend**: Update `static/js/script.js`
5. **Tests**: Add unit/integration tests

### Debugging

- Check `logs/app.log` for application logs
- Use `LOG_LEVEL=DEBUG` for verbose output
- Enable Flask debug mode for detailed errors

## Best Practices

1. **Always use blueprints** for route organization
2. **Keep services stateless** where possible
3. **Use dependency injection** via `current_app`
4. **Log errors** with context information
5. **Validate input** at route level
6. **Handle exceptions** gracefully
7. **Use type hints** for clarity
8. **Document complex logic** with docstrings

## Security Considerations

1. **SECRET_KEY**: Change in production
2. **CORS**: Restrict origins in production
3. **Input Validation**: Validate all user inputs
4. **Error Handling**: Don't expose internal details
5. **Logging**: Don't log sensitive information
6. **HTTPS**: Use in production
7. **Rate Limiting**: Consider adding for API endpoints

## Performance Optimization

1. **Caching**: Add Redis for API responses
2. **Database**: Use PostgreSQL for room persistence
3. **CDN**: Serve static files from CDN
4. **Load Balancing**: Use Nginx with multiple workers
5. **Monitoring**: Add Prometheus/Grafana metrics

## Future Enhancements

- [ ] Add user authentication (JWT)
- [ ] Implement caching layer (Redis)
- [ ] Add rate limiting
- [ ] Database persistence (PostgreSQL)
- [ ] Comprehensive test suite
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Docker containerization
- [ ] CI/CD pipeline
- [ ] Monitoring and metrics
- [ ] Admin dashboard
