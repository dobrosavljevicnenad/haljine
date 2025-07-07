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
  narudzbine: any[] = [];
  ucitavanje: boolean = false;
  filterBoja: string = '';
  screenshotUploadInProgress: boolean = false;
  korpa: any[] = [];

  novaHaljina = {
    naziv: '',
    slika: '',
    cena: 0,
    lager: [{ boja: '', kolicina: 0 }],
  };

  izabranaHaljina: any = null;
  izabranaBoja: string = '';
  formaKupca = {
    ime: '',
    prezime: '',
    adresa: '',
    telefon: '',
    screenshot: ''
  };

  novaBoja: { [id: string]: string } = {};
  novaKolicina: { [id: string]: number } = {};

  constructor() {
    this.ucitaj();
    this.ucitajNarudzbine();
  }

  ucitaj() {
    this.ucitavanje = true;
    this.http.get<any[]>('https://haljine.onrender.com/api/haljine', {
      params: { t: Date.now().toString() },
    }).subscribe(data => {
      this.haljine = data;
      this.ucitavanje = false;
    });
  }

  // naruci(id: string, boja: string, kolicina: number) {
  //   this.http.post(`https://haljine.onrender.com/api/naruci/${id}`, {
  //     boja,
  //     kolicina,
  //     ime: 'N/A',
  //     prezime: 'N/A',
  //     adresa: 'N/A',
  //     telefon: 'N/A'
  //   }).subscribe({
  //     next: () => {
  //       const haljina = this.haljine.find((h: any) => h._id === id);
  //       const bojaEntry = haljina?.lager.find((b: any) => b.boja === boja);
  //       if (bojaEntry) {
  //         bojaEntry.kolicina -= kolicina;
  //         if (bojaEntry.kolicina <= 0) {
  //           haljina.lager = haljina.lager.filter((b: any) => b.boja !== boja);
  //         }
  //       }
  //       this.ucitajNarudzbine(); // osveži listu
  //     },
  //     error: (err) => {
  //       if (err.status === 400 && err.error?.error === 'Nema dovoljno na lageru') {
  //         alert('❌ Boje trenutno nema na stanju.');
  //       } else {
  //         alert('❌ Došlo je do greške pri naručivanju.');
  //       }
  //     }
  //   });
  // }

  dodajHaljinu() {
    this.http.post('https://haljine.onrender.com/api/haljine', this.novaHaljina).subscribe(() => {
      this.ucitaj();
      this.novaHaljina = {
        naziv: '',
        slika: '',
        cena: 0,
        lager: [{ boja: '', kolicina: 0 }],
      };
    });
  }

  dodajUKorpu(haljina: any, boja: string) {
  const postojeca = this.korpa.find(item => item._id === haljina._id && item.boja === boja);
  if (postojeca) {
    postojeca.kolicina += 1;
  } else {
    this.korpa.push({
      _id: haljina._id,
      naziv: haljina.naziv,
      slika: haljina.slika,
      cena: haljina.cena,
      boja,
      kolicina: 1
    });
  }
}

ukloniIzKorpe(index: number) {
  this.korpa.splice(index, 1);
}

posaljiKorpu() {
  const payload = {
    proizvodi: this.korpa,
    kupac: this.formaKupca
  };

  this.http.post('https://haljine.onrender.com/api/naruci-vise', payload).subscribe({
    next: () => {
      alert('✅ Uspešno ste poručili više haljina!');
      this.korpa = [];
      this.formaKupca = { ime: '', prezime: '', adresa: '', telefon: '', screenshot: '' };
      this.ucitaj();
      this.ucitajNarudzbine();
    },
    error: () => {
      alert('❌ Greška pri slanju porudžbine iz korpe.');
    }
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

      const postojeca = haljina.lager.find((l: any) => l.boja === boja);
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

  ucitajNarudzbine() {
    this.http.get<any[]>('https://haljine.onrender.com/api/narudzbine', {
      params: { t: Date.now().toString() } // dodajemo timestamp da browser ne kešira
    }).subscribe(data => {
      this.narudzbine = data;
    });
  }


  otvoriFormuZaNarudzbinu(haljina: any, boja: string) {
    this.izabranaHaljina = haljina;
    this.izabranaBoja = boja;
    this.formaKupca = { ime: '', prezime: '', adresa: '', telefon: '', screenshot: '' };
  }

  posaljiNarudzbinu() {
    const kolicina = 1;

    this.http.post(`https://haljine.onrender.com/api/naruci/${this.izabranaHaljina._id}`, {
      boja: this.izabranaBoja,
      kolicina,
      ...this.formaKupca
    }).subscribe({
      next: () => {
        const bojaEntry = this.izabranaHaljina.lager.find((b: any) => b.boja === this.izabranaBoja);
        if (bojaEntry) {
          bojaEntry.kolicina -= kolicina;
          if (bojaEntry.kolicina <= 0) {
            this.izabranaHaljina.lager = this.izabranaHaljina.lager.filter((b: any) => b.boja !== this.izabranaBoja);
          }
        }
        this.izabranaHaljina = null;
        this.ucitajNarudzbine();
      },
      error: () => {
        alert('❌ Greška pri naručivanju.');
      }
    });
  }

  obrisiNarudzbinu(id: string) {
  if (!confirm('Da li si siguran da želiš da obrišeš ovu porudžbinu?')) return;

    this.http.delete(`https://haljine.onrender.com/api/narudzbine/${id}`).subscribe(() => {
      this.narudzbine = this.narudzbine.filter(n => n._id !== id);
    });
  }

  uploadScreenshot(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  this.screenshotUploadInProgress = true;

  const formData = new FormData();
  formData.append('slika', file);

  this.http.post<{ url: string }>('https://haljine.onrender.com/api/upload', formData)
    .subscribe({
      next: (res) => {
        this.formaKupca.screenshot = res.url;
        this.screenshotUploadInProgress = false;
      },
      error: () => {
        alert('Greška pri uploadu slike.');
        this.screenshotUploadInProgress = false;
      }
    });
  }


  get filteredHaljine(): any[] {
    const boja = this.filterBoja.trim().toLowerCase();
    if (!boja) return this.haljine;

    return this.haljine.filter(h =>
      h.lager.some((l: any) => l.boja.toLowerCase().includes(boja))
    );
  }

  get grupisaneNarudzbine() {
  // Grupisaćemo po kupac + vreme + screenshot (ili npr. grupniId ako ga imaš)
  const grupe: { [key: string]: any } = {};

  for (const n of this.narudzbine) {
    // Ključ može biti ime+prezime+adresa+telefon+screenshot+vreme (ali vreme može biti sa satima, pa možeš zaokružiti na minut)
    const vremeString = new Date(n.vreme).toISOString().slice(0,16); // yyyy-MM-ddTHH:mm
    const key = `${n.ime}|${n.prezime}|${n.adresa}|${n.telefon}|${n.screenshot}|${vremeString}`;

    if (!grupe[key]) {
      grupe[key] = {
        kupac: {
          ime: n.ime,
          prezime: n.prezime,
          adresa: n.adresa,
          telefon: n.telefon,
          screenshot: n.screenshot,
          vreme: n.vreme
        },
        proizvodi: []
      };
    }
    grupe[key].proizvodi.push(n);
  }

  return Object.values(grupe);
  }

  obrisiGrupuNarudzbina(screenshot: string) {
  if (!confirm('Da li si siguran da želiš da obrišeš celu grupu narudžbina?')) return;

  const encoded = encodeURIComponent(screenshot);
  this.http.delete(`https://haljine.onrender.com/api/narudzbine/grupa/${encoded}`).subscribe(() => {
    this.ucitajNarudzbine(); // osveži prikaz
  });
}



}
