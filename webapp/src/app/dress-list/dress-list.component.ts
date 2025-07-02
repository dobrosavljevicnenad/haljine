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
  ucitavanje: boolean = false; // 👈 dodato

  novaHaljina = {
    naziv: '',
    slika: '',
    lager: [{ boja: '', kolicina: 0 }],
  };

  novaBoja: { [id: string]: string } = {};
  novaKolicina: { [id: string]: number } = {};

  constructor() {
    this.ucitaj();
  }

  ucitaj() {
  this.ucitavanje = true; // 👈 Prikaži da učitava

  this.http.get<any[]>('https://haljine.onrender.com/api/haljine', {
    params: { t: Date.now().toString() },
  }).subscribe({
    next: data => {
      this.haljine = data;
      this.ucitavanje = false; // 👈 Sakrij indikator
    },
    error: () => {
      this.haljine = [];
      this.ucitavanje = false; // 👈 čak i na grešku, da ne visi
    }
  });
  }


  naruci(id: string, boja: string, kolicina: number) {
    this.http.post(`https://haljine.onrender.com/api/naruci/${id}`, { boja, kolicina }).subscribe(() => {
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

  // ✅ NOVI BEZBEDNI PRISTUP: ne čitamo i ne šaljemo celu haljinu više
  dodajIliAzurirajBoju(id: string, boja: string, kolicina: number) {
    if (!boja || !kolicina) return;

    this.http.post(`https://haljine.onrender.com/api/dodajKolicinu/${id}`, {
      boja,
      kolicina,
    }).subscribe(() => {
      this.ucitaj(); // osveži stanje
      this.novaBoja[id] = '';
      this.novaKolicina[id] = 0;
    });
  }

  obrisiHaljinu(id: string) {
  if (!confirm('Da li si siguran da želiš da obrišeš ovu haljinu?')) return;

  this.http.delete(`https://haljine.onrender.com/api/haljine/${id}`).subscribe(() => {
    this.ucitaj(); // osveži listu posle brisanja
  });
  }


}
