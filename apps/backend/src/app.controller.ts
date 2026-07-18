import { Controller, Get, Res } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller()
export class AppController {
  @Get()
  getHome(@Res() res: any) {
    return res.redirect('/login');
  }

  @Get('login')
  getLogin(@Res() res: any) {
    let htmlPath = path.join(process.cwd(), 'public', 'login.html');
    if (!fs.existsSync(htmlPath)) htmlPath = path.join(__dirname, '..', 'public', 'login.html');
    if (!fs.existsSync(htmlPath)) htmlPath = path.join(__dirname, 'public', 'login.html');

    if (fs.existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(fs.readFileSync(htmlPath, 'utf8'));
    }
    return res.status(404).send('login.html not found');
  }

  @Get('dashboard')
  getDashboard(@Res() res: any) {
    let htmlPath = path.join(process.cwd(), 'public', 'dashboard.html');
    if (!fs.existsSync(htmlPath)) htmlPath = path.join(__dirname, '..', 'public', 'dashboard.html');
    if (!fs.existsSync(htmlPath)) htmlPath = path.join(__dirname, 'public', 'dashboard.html');

    if (fs.existsSync(htmlPath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.send(fs.readFileSync(htmlPath, 'utf8'));
    }
    return res.status(404).send('dashboard.html not found');
  }
}
