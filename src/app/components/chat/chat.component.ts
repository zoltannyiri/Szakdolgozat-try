import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


interface UserPublic {
  username: string;
  profileImage?: string;
  lastActive?: Date | string | null;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, HttpClientModule],
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  socket!: Socket;
  receiverId!: string;
  senderId!: string;
  messageContent = '';
  messages: any[] = [];
  currentUserId = '';
  showScrollButton = false;

  isTyping = false;
  typingTimeout: any;

  userCache: Record<string, UserPublic> = {};
  me: { id: string; username: string; profileImage?: string } = { id: '', username: '' };

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private http: HttpClient
  ) {}

  private asDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

ngOnInit(): void {
  this.senderId = this.auth.getUserId() || '';
  this.currentUserId = this.senderId;

  this.http.get(`${environment.apiUrl}/api/profile`, {
    headers: { Authorization: `Bearer ${this.auth.getToken()}` }
  }).subscribe((res: any) => {
    const u = res?.user || {};
    this.me = { id: u._id, username: u.username || '', profileImage: u.profileImage };
    if (this.me.id) this.userCache[this.me.id] = { username: this.me.username, profileImage: this.me.profileImage };
  });

  this.route.queryParams.subscribe(params => {
    this.receiverId = params['userId'];

    this.http.get(`${environment.apiUrl}/api/users/${this.receiverId}/public`, {
      headers: { Authorization: `Bearer ${this.auth.getToken()}` }
    }).subscribe((u: any) => {
      this.userCache[this.receiverId] = {
        username: u?.username || '',
        profileImage: u?.profileImage,
        lastActive: this.asDate(u?.lastActive)
      };
    }, () => {
    });

    this.connectSocket();
    this.loadMessages();
  });
}

  ngOnDestroy(): void {
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    if (this.socket) this.socket.disconnect();
  }

  connectSocket(): void {
    this.socket = io('http://localhost:3000');
    this.socket.emit('joinRoom', this.senderId);

    this.socket.on('receiveMessage', (message: any) => {
      if (message.senderId === this.receiverId || message.receiverId === this.receiverId) {
        if (!message.timestamp) message.timestamp = new Date();
        this.messages.push(message);
        this.scrollToBottom();

        this.socket.emit('markAsRead', { senderId: message.senderId, receiverId: message.receiverId });
      }
    });

    this.socket.on('messagesReadByReceiver', ({ by }) => {
      if (by === this.receiverId) {
        this.messages.forEach(m => { if (m.senderId === this.currentUserId) m.read = true; });
      }
    });

    this.socket.on('userTyping', (data: any) => { if (data.userId === this.receiverId) this.isTyping = true; });
    this.socket.on('userStopTyping', (data: any) => { if (data.userId === this.receiverId) this.isTyping = false; });

    this.socket.emit('markAsRead', { senderId: this.receiverId, receiverId: this.senderId });

    setInterval(() => {
      const hasUnread = this.messages.some(m => m.senderId === this.receiverId && !m.read);
      if (hasUnread) this.socket.emit('markAsRead', { senderId: this.receiverId, receiverId: this.senderId });
    }, 5000);
  }

  loadMessages(): void {
    this.http.get(`${environment.apiUrl}/api/messages?receiverId=${this.receiverId}`, {
      headers: { Authorization: `Bearer ${this.auth.getToken()}` }
    }).subscribe((res: any) => {
      if (res?.users && typeof res.users === 'object') {
        this.userCache = { ...this.userCache, ...res.users };
      }
      this.messages = (res?.messages || []).map((m: any) => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      }));
      this.scrollToBottom();
      if (this.socket) this.socket.emit('markAsRead', { senderId: this.receiverId, receiverId: this.senderId });
    });
  }

  sendMessage(): void {
    if (!this.messageContent.trim()) return;

    const message = {
      senderId: this.senderId,
      receiverId: this.receiverId,
      content: this.messageContent.trim(),
      timestamp: new Date()
    };

    this.socket.emit('sendMessage', message);
    this.messageContent = '';
    this.stopTyping();
    setTimeout(() => this.loadMessages(), 300);
  }

  onTyping(): void {
    this.socket.emit('typing', { userId: this.senderId, receiverId: this.receiverId });
    if (this.typingTimeout) clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => this.stopTyping(), 1000);
  }
  stopTyping(): void {
    this.socket.emit('stopTyping', { userId: this.senderId, receiverId: this.receiverId });
    this.isTyping = false;
  }

  getInitialsFromName(name: string): string {
    if (!name) return 'U';
    const p = name.trim().split(/\s+/);
    return (p[0]?.[0] || 'U').toUpperCase() + (p[1]?.[0] || '').toUpperCase();
  }

  isLastOwnMessage(index: number): boolean {
    if (index !== this.messages.length - 1) return false;
    for (let i = this.messages.length - 1; i > index; i--) {
      if (this.messages[i].senderId !== this.currentUserId) return false;
    }
    return this.messages[index].senderId === this.currentUserId;
  }

  scrollToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chat-box');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }

  handleScroll(e: Event): void {
    const el = e.target as HTMLElement;
    const atBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50;
    this.showScrollButton = !atBottom;
  }


}
