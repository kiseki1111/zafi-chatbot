import { Controller, Get, Res } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHome(@Res() res: any) {
    return res.redirect('/login');
  }
}
