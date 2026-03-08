class DatingApp {
  constructor() {
    this.apiUrl = 'http://localhost:3000';
    this.token = localStorage.getItem('token');
    this.currentUser = null;
    this.currentProfiles = [];
    this.currentProfileIndex = 0;
    this.currentChatUser = null;
    this.chatWebSocket = null;

    this.init();
  }

  init() {
    if (this.token) {
      this.loadCurrentUser();
    } else {
      this.showLanding();
    }
  }

  async loadCurrentUser() {
    try {
      const response = await fetch(`${this.apiUrl}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.ok) {
        this.token = null;
        localStorage.removeItem('token');
        this.showLanding();
        return;
      }

      this.currentUser = await response.json();
      this.showDashboard();
      this.loadProfiles();
    } catch (error) {
      console.error('Failed to load user:', error);
      this.showLanding();
    }
  }

  // Page Navigation
  showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.add('hidden'));
    document.getElementById(pageId).classList.remove('hidden');
  }

  showLanding() {
    this.showPage('landing-page');
  }

  showSignUp() {
    this.showPage('signup-page');
  }

  showLogin() {
    this.showPage('login-page');
  }

  showDashboard() {
    this.showPage('dashboard-page');
  }

  showProfile() {
    this.loadProfileData();
    this.showPage('profile-page');
  }

  showMatches() {
    this.loadMatches();
    this.showPage('matches-page');
  }

  showChat(userId) {
    this.currentChatUser = userId;
    this.showPage('chat-page');
    this.loadChatMessages();
    this.connectWebSocket();
  }

  // Authentication
  async handleSignUp(event) {
    event.preventDefault();

    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const age = document.getElementById('signup-age').value;
    const gender = document.getElementById('signup-gender').value;
    const location = document.getElementById('signup-location').value;
    const interests = document.getElementById('signup-interests').value;

    const messageEl = document.getElementById('signup-message');

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          age: age ? parseInt(age) : null,
          gender,
          location,
          interests
        })
      });

      const data = await response.json();

      if (!response.ok) {
        messageEl.textContent = data.error || 'Sign up failed';
        messageEl.className = 'form-message error';
        return;
      }

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('token', this.token);

      messageEl.textContent = 'Account created successfully!';
      messageEl.className = 'form-message success';

      setTimeout(() => this.showDashboard(), 1000);
    } catch (error) {
      messageEl.textContent = 'Sign up failed. Please try again.';
      messageEl.className = 'form-message error';
    }
  }

  async handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const messageEl = document.getElementById('login-message');

    try {
      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        messageEl.textContent = data.error || 'Login failed';
        messageEl.className = 'form-message error';
        return;
      }

      this.token = data.token;
      this.currentUser = data.user;
      localStorage.setItem('token', this.token);

      messageEl.textContent = 'Login successful!';
      messageEl.className = 'form-message success';

      setTimeout(() => {
        this.loadCurrentUser();
      }, 500);
    } catch (error) {
      messageEl.textContent = 'Login failed. Please try again.';
      messageEl.className = 'form-message error';
    }
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      this.token = null;
      this.currentUser = null;
      localStorage.removeItem('token');
      this.closeWebSocket();
      this.showLanding();
    }
  }

  // Profile Management
  async loadProfiles() {
    try {
      const response = await fetch(`${this.apiUrl}/api/profiles`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.ok) return;

      this.currentProfiles = await response.json();
      this.currentProfileIndex = 0;
      this.displayProfile();
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  }

  displayProfile() {
    const noProfilesMsg = document.getElementById('no-profiles-message');

    if (this.currentProfileIndex >= this.currentProfiles.length) {
      noProfilesMsg.classList.remove('hidden');
      document.getElementById('profile-card').style.display = 'none';
      return;
    }

    noProfilesMsg.classList.add('hidden');
    document.getElementById('profile-card').style.display = 'flex';

    const profile = this.currentProfiles[this.currentProfileIndex];

    document.getElementById('card-name').textContent = `${profile.name}, ${profile.age}`;
    document.getElementById('card-location').textContent = profile.location || 'Location not specified';
    document.getElementById('card-bio').textContent = profile.bio || 'No bio yet';

    const interestsContainer = document.getElementById('card-interests');
    interestsContainer.innerHTML = '';
    if (profile.interests && profile.interests.length > 0) {
      profile.interests.forEach(interest => {
        if (interest.trim()) {
          const tag = document.createElement('div');
          tag.className = 'interest-tag';
          tag.textContent = interest.trim();
          interestsContainer.appendChild(tag);
        }
      });
    }

    const cardImage = document.getElementById('card-image');
    if (profile.profileImage) {
      cardImage.src = `${this.apiUrl}${profile.profileImage}`;
    } else {
      cardImage.src = this.getDefaultAvatar();
    }
  }

  getDefaultAvatar() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAKICAGPHJLY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNmZmU1ZTUiLz4KICAKICAGPC9zdmc+';
  }

  async loadProfileData() {
    try {
      const response = await fetch(`${this.apiUrl}/api/users/me`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.ok) return;

      const user = await response.json();

      document.getElementById('profile-name').value = user.name;
      document.getElementById('profile-age').value = user.age || '';
      document.getElementById('profile-gender').value = user.gender || '';
      document.getElementById('profile-location').value = user.location || '';
      document.getElementById('profile-bio').value = user.bio || '';
      document.getElementById('profile-interests').value = (user.interests || []).join(', ');

      if (user.profileImage) {
        document.getElementById('profile-avatar').src = `${this.apiUrl}${user.profileImage}`;
      } else {
        document.getElementById('profile-avatar').src = this.getDefaultAvatar();
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  async handleProfileUpdate(event) {
    event.preventDefault();

    const name = document.getElementById('profile-name').value;
    const age = document.getElementById('profile-age').value;
    const gender = document.getElementById('profile-gender').value;
    const location = document.getElementById('profile-location').value;
    const bio = document.getElementById('profile-bio').value;
    const interests = document.getElementById('profile-interests').value.split(',').map(i => i.trim()).filter(i => i);

    const messageEl = document.getElementById('profile-message');

    try {
      const response = await fetch(`${this.apiUrl}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          age: age ? parseInt(age) : null,
          gender,
          location,
          bio,
          interests
        })
      });

      if (!response.ok) throw new Error('Failed to update');

      messageEl.textContent = 'Profile updated successfully!';
      messageEl.className = 'form-message success';
    } catch (error) {
      messageEl.textContent = 'Failed to update profile.';
      messageEl.className = 'form-message error';
    }
  }

  async handleProfileImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;

      try {
        const response = await fetch(`${this.apiUrl}/api/users/upload-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ image: base64 })
        });

        if (!response.ok) throw new Error('Upload failed');

        const data = await response.json();
        document.getElementById('profile-avatar').src = `${this.apiUrl}${data.imageUrl}`;
      } catch (error) {
        console.error('Upload failed:', error);
      }
    };
    reader.readAsDataURL(file);
  }

  // Swiping
  async likeProfile() {
    if (this.currentProfileIndex >= this.currentProfiles.length) return;

    const profile = this.currentProfiles[this.currentProfileIndex];

    try {
      const response = await fetch(`${this.apiUrl}/api/likes/${profile.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const data = await response.json();

      if (data.matched) {
        alert('🎉 You have a match! Go to your matches to start chatting.');
      }

      this.nextProfile();
    } catch (error) {
      console.error('Like failed:', error);
    }
  }

  passProfile() {
    this.nextProfile();
  }

  nextProfile() {
    this.currentProfileIndex++;
    this.displayProfile();
  }

  async messageProfile() {
    if (this.currentProfileIndex >= this.currentProfiles.length) return;

    const profile = this.currentProfiles[this.currentProfileIndex];

    try {
      const response = await fetch(`${this.apiUrl}/api/likes/${profile.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const data = await response.json();

      if (data.matched) {
        this.showChat(profile.id);
      } else {
        alert('Please match before messaging. Like them first!');
      }
    } catch (error) {
      console.error('Message failed:', error);
    }
  }

  // Matches
  async loadMatches() {
    try {
      const response = await fetch(`${this.apiUrl}/api/matches`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.ok) return;

      const matches = await response.json();
      this.displayMatches(matches);
    } catch (error) {
      console.error('Failed to load matches:', error);
    }
  }

  displayMatches(matches) {
    const matchesList = document.getElementById('matches-list');
    const noMatchesMsg = document.getElementById('no-matches-message');

    if (matches.length === 0) {
      matchesList.innerHTML = '';
      noMatchesMsg.classList.remove('hidden');
      return;
    }

    noMatchesMsg.classList.add('hidden');
    matchesList.innerHTML = matches.map(match => `
      <div class="match-card" onclick="app.showChat(${match.userId})">
        <div class="match-card-image">
          <img src="${match.profileImage ? this.apiUrl + match.profileImage : this.getDefaultAvatar()}" alt="${match.name}">
        </div>
        <div class="match-card-info">
          <div class="match-card-name">${match.name}</div>
          <div class="match-card-location">${match.location || 'Unknown'}</div>
        </div>
      </div>
    `).join('');
  }

  // Chat
  async loadChatMessages() {
    try {
      const response = await fetch(`${this.apiUrl}/api/messages/${this.currentChatUser}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      if (!response.ok) return;

      const messages = await response.json();
      this.displayMessages(messages);

      // Get match user info for header
      const matchesResponse = await fetch(`${this.apiUrl}/api/matches`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const matches = await matchesResponse.json();
      const matchUser = matches.find(m => m.userId === this.currentChatUser);
      if (matchUser) {
        document.getElementById('chat-header').textContent = matchUser.name;
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  displayMessages(messages) {
    const messagesList = document.getElementById('messages-list');
    messagesList.innerHTML = messages.map(msg => `
      <div class="message ${msg.senderId === this.currentUser.id ? 'sent' : 'received'}">
        <div class="message-content">${this.escapeHtml(msg.content)}</div>
        <div class="message-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
      </div>
    `).join('');

    messagesList.scrollTop = messagesList.scrollHeight;
  }

  connectWebSocket() {
    if (this.chatWebSocket) this.closeWebSocket();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3000/api/chat/${this.currentChatUser}`;

    this.chatWebSocket = new WebSocket(wsUrl);

    this.chatWebSocket.onopen = () => {
      const token = this.token;
      this.chatWebSocket.send(JSON.stringify({ type: 'auth', token }));
    };

    this.chatWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const messagesList = document.getElementById('messages-list');

        const messageEl = document.createElement('div');
        messageEl.className = `message ${data.senderId === this.currentUser.id ? 'sent' : 'received'}`;
        messageEl.innerHTML = `
          <div class="message-content">${this.escapeHtml(data.content)}</div>
          <div class="message-time">${new Date(data.createdAt).toLocaleTimeString()}</div>
        `;

        messagesList.appendChild(messageEl);
        messagesList.scrollTop = messagesList.scrollHeight;
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    this.chatWebSocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  closeWebSocket() {
    if (this.chatWebSocket) {
      this.chatWebSocket.close();
      this.chatWebSocket = null;
    }
  }

  sendMessage() {
    const input = document.getElementById('chat-input');
    const content = input.value.trim();

    if (!content) return;

    if (this.chatWebSocket && this.chatWebSocket.readyState === WebSocket.OPEN) {
      this.chatWebSocket.send(JSON.stringify({ content }));
      input.value = '';
    } else {
      console.error('WebSocket not connected');
    }
  }

  handleChatKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

const app = new DatingApp();