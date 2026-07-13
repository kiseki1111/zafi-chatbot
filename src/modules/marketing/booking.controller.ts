import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Controller('marketing/bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  async getBookings() {
    return this.bookingService.getBookings();
  }

  @Post()
  async createBooking(@Body() data: any) {
    return this.bookingService.createBooking(data);
  }
}
