import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, HttpClientModule],
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {
  socket!: Socket;
  receiverId!: string;
  senderId!: string;
  messageContent: string = '';
  messages: any[] = [];
  currentUserId: string = '';
  showScrollButton: boolean = false;


  constructor(
    private route: ActivatedRoute,
    private authService: AuthService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.senderId = this.authService.getUserId() || '';
    this.currentUserId = this.senderId;
    this.route.queryParams.subscribe(params => {
      this.receiverId = params['userId'];
      this.loadMessages();
      this.connectSocket();
    });
    

  }

  connectSocket() {
  this.socket = io('http://localhost:3000');

  // Beléptetjük a saját szobájába
  this.socket.emit('joinRoom', this.senderId);

  // Fogadott üzenet
  this.socket.on('receiveMessage', (message: any) => {
    if (message.senderId === this.receiverId || message.receiverId === this.receiverId) {
      this.messages.push(message);

      // Azonnal olvasottnak jelöljük, ha a másik most küldött
      this.socket.emit('markAsRead', {
        senderId: message.senderId,
        receiverId: message.receiverId
      });
    }
  });

  // Valaki olvasta az üzenetünket
  this.socket.on('messagesReadByReceiver', ({ by }) => {
    if (by === this.receiverId) {
      this.messages.forEach(msg => {
        if (msg.senderId === this.currentUserId) {
          msg.read = true;
        }
      });
    }
  });

  // Mikor megnyílik a chat, jelöljük az összes eddigit olvasottnak
  this.socket.emit('markAsRead', {
    senderId: this.receiverId,
    receiverId: this.senderId
  });

  // + 5 másodpercenként figyeljük, ha van olvasatlan
  setInterval(() => {
    const hasUnread = this.messages.some(msg =>
      msg.senderId === this.receiverId && !msg.read
    );

    if (hasUnread) {
      this.socket.emit('markAsRead', {
        senderId: this.receiverId,
        receiverId: this.senderId
      });
    }
  }, 5000);
}



  loadMessages() {
  this.http.get(`${environment.apiUrl}/api/messages?receiverId=${this.receiverId}`, {
    headers: { Authorization: `Bearer ${this.authService.getToken()}` }
  }).subscribe((res: any) => {
    this.messages = res.messages;

    // ✅ Miután megkaptuk az üzeneteket, jelöljük olvasottnak
    this.socket.emit('markAsRead', {
      senderId: this.receiverId,
      receiverId: this.senderId
    });
  });
}


  sendMessage() {
  if (!this.messageContent.trim()) return;
  const message = {
    senderId: this.senderId,
    receiverId: this.receiverId,
    content: this.messageContent
  };
  this.socket.emit('sendMessage', message);
  this.messageContent = '';

  // Kis késleltetéssel újratöltjük az üzeneteket, hogy a "read" mező frissüljön
  setTimeout(() => this.loadMessages(), 300);
}

  // ÚJ METÓDUS – az utolsó üzenet ellenőrzésére
  isLastOwnMessage(index: number): boolean {
    if (index !== this.messages.length - 1) return false;

    for (let i = this.messages.length - 1; i > index; i--) {
      if (this.messages[i].senderId !== this.currentUserId) {
        return false;
      }
    }

    return this.messages[index].senderId === this.currentUserId;
  }

  // Görgetés az aljára
  scrollToBottom(): void {
    setTimeout(() => {
      const chatBox = document.getElementById('chat-box');
      if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }, 0);
  }

  handleScroll(event: Event): void {
  const element = event.target as HTMLElement;
  const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
  this.showScrollButton = !atBottom;
  }
}