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
  ucitavanje: boolean = false;

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
    this.ucitavanje = true;
    this.http.get<any[]>('https://haljine.onrender.com/api/haljine', {
      params: { t: Date.now().toString() }, // sprečava keširanje
    }).subscribe(data => {
      this.haljine = data;
      this.ucitavanje = false;
    });
  }

  naruci(id: string, boja: string, kolicina: number) {
    this.http.post(`https://haljine.onrender.com/api/naruci/${id}`, { boja, kolicina }).subscribe(() => {
      const haljina = this.haljine.find((h:any) => h._id === id);
      const bojaEntry = haljina?.lager.find((b:any) => b.boja === boja);
      if (bojaEntry) {
        bojaEntry.kolicina -= kolicina;
      }
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
    if (!boja || !kolicina) return;

    this.http.post(`https://haljine.onrender.com/api/dodajKolicinu/${id}`, {
      boja,
      kolicina,
    }).subscribe(() => {
      const haljina = this.haljine.find(h => h._id === id);
      if (!haljina) return;

      const postojeca = haljina.lager.find((l:any) => l.boja === boja);
      if (postojeca) {
        postojeca.kolicina += kolicina;
      } else {
        haljina.lager.push({ boja, kolicina });
      }

      this.novaBoja[id] = '';
      this.novaKolicina[id] = 0;
    });
  }

  obrisiHaljinu(id: string) {
    if (!confirm('Da li si siguran da želiš da obrišeš ovu haljinu?')) return;

    this.http.delete(`https://haljine.onrender.com/api/haljine/${id}`).subscribe(() => {
      this.haljine = this.haljine.filter(h => h._id !== id);
    });
  }
}
