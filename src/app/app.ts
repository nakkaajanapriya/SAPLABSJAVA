import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

type User = { name: string; email: string; password: string };
type Product = { id: number; title: string; price: number; image: string };
type CartItem = { product: Product; qty: number };
type Order = { id: number; items: CartItem[]; total: number; date: string };

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class AppComponent {

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private getItem(key: string): any {
    if (!this.isBrowser()) return null;
    return JSON.parse(localStorage.getItem(key) || 'null');
  }

  private setItem(key: string, value: any) {
    if (!this.isBrowser()) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ===== AUTH =====
  mode: 'login' | 'register' | 'products' | 'cart' | 'wishlist' | 'orders' = 'login';

  regName = '';
  regEmail = '';
  regPassword = '';

  loginEmail = '';
  loginPassword = '';
  message = '';

  register() {
    const users: User[] = this.getItem('users') || [];

    users.push({
      name: this.regName,
      email: this.regEmail,
      password: this.regPassword
    });

    this.setItem('users', users);
    this.mode = 'login';
    this.message = 'Registered Successfully!';
  }

  login() {
    const users: User[] = this.getItem('users') || [];

    const user = users.find(
      u => u.email === this.loginEmail && u.password === this.loginPassword
    );

    if (!user) {
      this.message = 'Invalid credentials!';
      return;
    }

    this.setItem('currentUser', user.email);
    this.mode = 'products';
    this.message = '';
  }

  logout() {
    localStorage.removeItem('currentUser');
    this.mode = 'login';
  }

  // ===== PRODUCTS =====
  products: Product[] = [
    { id: 1, title: 'Smart Watch', price: 2999, image: 'https://via.placeholder.com/200' },
    { id: 2, title: 'Headphones', price: 1499, image: 'https://via.placeholder.com/200' },
    { id: 3, title: 'Backpack', price: 999, image: 'https://via.placeholder.com/200' }
  ];

  // ===== CART =====
  getCart(): CartItem[] {
    return this.getItem('cart') || [];
  }

  saveCart(cart: CartItem[]) {
    this.setItem('cart', cart);
  }

  addToCart(p: Product) {
    const cart = this.getCart();
    const existing = cart.find(c => c.product.id === p.id);

    if (existing) existing.qty++;
    else cart.push({ product: p, qty: 1 });

    this.saveCart(cart);
  }

  removeFromCart(id: number) {
    const cart = this.getCart().filter(c => c.product.id !== id);
    this.saveCart(cart);
  }

  cartTotal(): number {
    return this.getCart().reduce((sum, c) => sum + c.product.price * c.qty, 0);
  }

  // ===== WISHLIST =====
  getWishlist(): Product[] {
    return this.getItem('wishlist') || [];
  }

  toggleWishlist(p: Product) {
    const list = this.getWishlist();
    const exists = list.find(item => item.id === p.id);

    if (exists) {
      this.setItem('wishlist', list.filter(i => i.id !== p.id));
    } else {
      list.push(p);
      this.setItem('wishlist', list);
    }
  }

  inWishlist(id: number): boolean {
    return this.getWishlist().some(p => p.id === id);
  }

  // ===== ORDERS =====
  getOrders(): Order[] {
    return this.getItem('orders') || [];
  }

  placeOrder() {
    const cart = this.getCart();
    if (cart.length === 0) return;

    const newOrder: Order = {
      id: Date.now(),
      items: cart,
      total: this.cartTotal(),
      date: new Date().toLocaleString()
    };

    const orders = this.getOrders();
    orders.unshift(newOrder);

    this.setItem('orders', orders);
    this.setItem('cart', []);
    this.mode = 'orders';
  }
}
