/**
 * DOM Elements Manager
 * Central reference to all DOM elements
 */

export const DOM = {
    // Search elements
    searchInput: null,
    searchResults: null,
    resultsContainer: null,
    searchSuggestions: null,
    suggestionsContent: null,
    welcomeSection: null,
    loadingSpinner: null,
    
    // Liked songs elements
    likedSongsSection: null,
    likedContainer: null,
    likeCurrentSongBtn: null,
    
    // Playlist elements
    playlistsContainer: null,
    playlistView: null,
    playlistContainer: null,
    playlistImage: null,
    playlistTitle: null,
    playlistDescription: null,
    
    // Room elements
    createRoomBtn: null,
    joinRoomBtn: null,
    roomModal: null,
    closeModal: null,
    modalTitle: null,
    usernameInput: null,
    roomIdInput: null,
    roomIdGroup: null,
    modalActionBtn: null,
    roomInfo: null,
    roomStatus: null,
    roomUsers: null,
    
    // Player elements
    audioPlayer: null,
    playPauseBtn: null,
    prevBtn: null,
    nextBtn: null,
    playerImage: null,
    playerTitle: null,
    playerArtist: null,
    currentTime: null,
    totalTime: null,
    progressSlider: null,
    progressFill: null,
    volumeSlider: null,
    volumeFill: null,
    volumeBtn: null,
    
    // Lyrics elements
    lyricsBtn: null,
    lyricsTerminal: null,
    lyricsContent: null,
    closeLyricsBtn: null,
    
    // Initialize all DOM references
    init() {
        // Search
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.searchSuggestions = document.getElementById('searchSuggestions');
        this.suggestionsContent = document.getElementById('suggestionsContent');
        this.welcomeSection = document.getElementById('welcomeSection');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        
        // Liked songs
        this.likedSongsSection = document.getElementById('likedSongs');
        this.likedContainer = document.getElementById('likedContainer');
        this.likeCurrentSongBtn = document.getElementById('likeCurrentSongBtn');
        
        // Playlists
        this.playlistsContainer = document.getElementById('playlistsContainer');
        this.playlistView = document.getElementById('playlistView');
        this.playlistContainer = document.getElementById('playlistContainer');
        this.playlistImage = document.getElementById('playlistImage');
        this.playlistTitle = document.getElementById('playlistTitle');
        this.playlistDescription = document.getElementById('playlistDescription');
        
        // Room
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.joinRoomBtn = document.getElementById('joinRoomBtn');
        this.roomModal = document.getElementById('roomModal');
        this.closeModal = document.getElementById('closeModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.usernameInput = document.getElementById('usernameInput');
        this.roomIdInput = document.getElementById('roomIdInput');
        this.roomIdGroup = document.getElementById('roomIdGroup');
        this.modalActionBtn = document.getElementById('modalActionBtn');
        this.roomInfo = document.getElementById('roomInfo');
        this.roomStatus = document.getElementById('roomStatus');
        this.roomUsers = document.getElementById('roomUsers');
        
        // Player
        this.audioPlayer = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.playerImage = document.getElementById('playerImage');
        this.playerTitle = document.getElementById('playerTitle');
        this.playerArtist = document.getElementById('playerArtist');
        this.currentTime = document.getElementById('currentTime');
        this.totalTime = document.getElementById('totalTime');
        this.progressSlider = document.getElementById('progressSlider');
        this.progressFill = document.getElementById('progressFill');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeFill = document.getElementById('volumeFill');
        this.volumeBtn = document.getElementById('volumeBtn');
        
        // Lyrics
        this.lyricsBtn = document.getElementById('lyricsBtn');
        this.lyricsTerminal = document.getElementById('lyricsTerminal');
        this.lyricsContent = document.getElementById('lyricsContent');
        this.closeLyricsBtn = document.getElementById('closeLyricsBtn');
    }
};
