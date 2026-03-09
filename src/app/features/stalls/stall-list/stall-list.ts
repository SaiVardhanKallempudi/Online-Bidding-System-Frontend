import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StallService } from '../../../core/services/stall';
import { AuthService } from '../../../core/services/auth';
import { Stall } from '../../../core/models/stall.model';
import { CountdownTimer } from "../../../shared/components/countdown-timer/countdown-timer";

@Component({
  selector: 'app-stall-list',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, CountdownTimer],
  templateUrl: './stall-list.html',
  styleUrls: ['./stall-list.scss']
})
export class StallList implements OnInit {
  stalls: Stall[] = [];
  filteredStalls: Stall[] = [];
  isLoading = true;
  searchQuery = '';
  selectedCategory = '';
  selectedStatus = '';
  selectedLocation = '';
  minPrice = 0;
  maxPrice = 0;
  sortBy = 'name'; // name, price-low, price-high, ending-soon, most-bids
  showFilters = false;
  
  categories: string[] = ['Food', 'Electronics', 'Clothing', 'Books', 'Accessories', 'Games', 'Services', 'Other'];
  locations: string[] = [
    'Block A - Ground Floor',
    'Block A - First Floor',
    'Block B - Ground Floor',
    'Block B - First Floor',
    'Main Entrance',
    'Cafeteria Area',
    'Library Area',
    'Sports Complex',
    'Outdoor Area'
  ];

  constructor(
    private stallService: StallService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStalls();
  }

  loadStalls(): void {
    this.isLoading = true;

    
    this.stallService.getAllStalls().subscribe({
      next: (stalls) => {
        console.log('First stall:', stalls[0]);
        this.stalls = stalls;
        this.initializePriceRange();
        this.applyFiltersAndSort();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        
        this.initializePriceRange();
        this.applyFiltersAndSort();
      }
    });
  }

  initializePriceRange(): void {
    if (this.stalls.length === 0) return;
    const prices = this.stalls.map(s => s.basePrice);
    this.minPrice = 0;
    this.maxPrice = 0;
  }

  applyFiltersAndSort(): void {
    
    // First filter
    this.filteredStalls = this.stalls.filter(stall => {
      const matchesSearch = !this.searchQuery || 
        stall.stallName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        stall.location.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        stall.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchesCategory = !this.selectedCategory || stall.category === this.selectedCategory;
      const matchesStatus = !this.selectedStatus || stall.status === this.selectedStatus;
      const matchesLocation = !this.selectedLocation || stall.location === this.selectedLocation;
      const matchesPrice = (!this.minPrice || stall.basePrice >= this.minPrice) && 
                          (!this.maxPrice || stall.basePrice <= this.maxPrice);

      return matchesSearch && matchesCategory && matchesStatus && matchesLocation && matchesPrice;
    });


    // Then sort
    this.sortStalls();
  }

  sortStalls(): void {
    
    switch (this.sortBy) {
      case 'price-low':
        this.filteredStalls.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-high':
        this.filteredStalls.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'ending-soon':
        this.filteredStalls.sort((a, b) => {
          if (!a.biddingEnd || !b.biddingEnd) return 0;
          return new Date(a.biddingEnd).getTime() - new Date(b.biddingEnd).getTime();
        });
        break;
      case 'most-bids':
        this.filteredStalls.sort((a, b) => (b.totalBids || 0) - (a.totalBids || 0));
        break;
      case 'name':
      default:
        this.filteredStalls.sort((a, b) => a.stallName.localeCompare(b.stallName));
        break;
    }
  }

  onFilterChange(): void {
    this.applyFiltersAndSort();
  }

  onSortChange(): void {
    this.sortStalls();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.selectedStatus = '';
    this.selectedLocation = '';
    this.minPrice = 0;
    this.maxPrice = 0;
    this.sortBy = 'name';
    this.applyFiltersAndSort();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'AVAILABLE': return 'bg-blue-100 text-blue-800';
      case 'CLOSED': return 'bg-gray-100 text-gray-800';
      case 'BOOKED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  isBidder(): boolean {
    const user = this.authService.getUser();
    return user?.role === 'BIDDER' || user?.role === 'ADMIN';
  }

  canJoinBidding(stall: Stall): boolean {
    return stall.status === 'ACTIVE' && this.isBidder();
  }

  // Manual navigation method for debugging
  navigateToDetail(stallId: number): void {
    
    if (!stallId) {
      alert('Error: Invalid stall ID');
      return;
    }
    
    this.router.navigate(['/stalls', stallId]).then(success => {
    });
  }

  
}