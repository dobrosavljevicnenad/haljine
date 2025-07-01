import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dress-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './dress-list.component.html',
  styleUrls: ['./dress-list.component.scss'],
})
export class DressListComponent {
  private http = inject(HttpClient);
  haljine: any[] = [];

  novaHaljina = {
    naziv: '',
    slika: '',
    lager: [
      { boja: '', kolicina: 0 },
    ],
  };

  novaBoja: { [id: string]: string } = {};
  novaKolicina: { [id: string]: number } = {};

  constructor() {
    this.ucitaj();
  }

  ucitaj() {
    this.http.get<any[]>('http://haljine.onrender.com/api/haljine').subscribe(data => {
      this.haljine = data;
    });
  }

  naruci(id: string, boja: string, kolicina: number) {
    this.http.post(`http://haljine.onrender.com/api/naruci/${id}`, { boja, kolicina }).subscribe(() => {
      this.ucitaj();
    });
  }

  dodajHaljinu() {
    this.http.post('https://haljine.onrender.com/api/haljine', this.novaHaljina).subscribe(() => {
      this.ucitaj();
      this.novaHaljina = {
        naziv: '',
        slika: '',
        lager: [{ boja: '', kolicina: 0 }],
      };
    });
  }

  dodajBojuPolje() {
    this.novaHaljina.lager.push({ boja: '', kolicina: 0 });
  }

  uploadSlika(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('slika', file);

    this.http.post<{ url: string }>('https://haljine.onrender.com/api/upload', formData).subscribe(res => {
      this.novaHaljina.slika = res.url;
    });
  }

  dodajIliAzurirajBoju(id: string, boja: string, kolicina: number) {
    const haljina = this.haljine.find(h => h._id === id);
    if (!haljina) return;

    const postojeca = haljina.lager.find((b: { boja: string; kolicina: number }) => b.boja.toLowerCase() === boja.toLowerCase());

    if (postojeca) {
      postojeca.kolicina += kolicina;
    } else {
      haljina.lager.push({ boja, kolicina });
    }

    this.http.put(`https://haljine.onrender.com/api/haljine/${id}`, haljina).subscribe(() => {
      this.ucitaj();
      this.novaBoja[id] = '';
      this.novaKolicina[id] = 0;
    });
  }
}
