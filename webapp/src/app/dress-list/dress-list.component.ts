import { Component, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dress-list',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './dress-list.component.html',
  styleUrls: ['./dress-list.component.scss'],
})
export class DressListComponent implements OnInit {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  haljine: any[] = [];
  narudzbine: any[] = [];
  ucitavanje: boolean = false;
  filterBoja: string = '';
  filterName: string = '';
  screenshotUploadInProgress: boolean = false;
  uploadInProgress: boolean = false;
  korpa: any[] = [];
  backendStatus: 'cekanje' | 'aktivno' | 'neuspesno' = 'cekanje';
  datumOd: string = '';
  datumDo: string = '';

  novaHaljina = {
    naziv: '',
    slika: '',
    cena: 0,
    lager: [{ boja: '', kolicina: 0 }],
  };

  izabranaHaljina: any = null;
  izabranaBoja: string = '';
  formaKupca = {
    // ime: '',
    // prezime: '',
    // adresa: '',
    // telefon: '',
    screenshot: ''
  };

  novaBoja: { [id: string]: string } = {};
  novaKolicina: { [id: string]: number } = {};

  token: string | null = null;
  username: string = '';
  password: string = '';

  ngOnInit() {
  if (isPlatformBrowser(this.platformId)) {
    this.token = localStorage.getItem('token');
  }

  this.backendStatus = 'cekanje';

  if (this.token) {
    this.http.get('https://backend-za-haljine.fly.dev/api/proveri-token', this.authHeaders()).subscribe({
      next: () => {
        this.backendStatus = 'aktivno';
        this.ucitaj();
        this.ucitajNarudzbine();
      },
      error: err => {
        this.backendStatus = 'neuspesno';
        if (err.status === 401 || err.status === 403) {
          this.logout();
        }
      }
    });
  } else {
    this.backendStatus = 'aktivno';
  }
  }

  login() {
    this.http.post<{ token: string }>('https://backend-za-haljine.fly.dev/api/login', {
      username: this.username,
      password: this.password
    }).subscribe({
      next: res => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('token', res.token);
        }
        this.token = res.token;
        this.username = '';
        this.password = '';
        this.ucitaj();
        this.ucitajNarudzbine();
      },
      error: () => alert('❌ Neispravni podaci')
    });
  }

  logout() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
    }
    this.token = null;
    this.haljine = [];
    this.narudzbine = [];
    this.korpa = [];
    this.ucitavanje = false;
    window.location.reload(); // 👈 Ovo forsira refresh aplikacije
  }

  resetujFilter(){
    this.datumOd = '';
    this.datumDo = '';
  }

  authHeaders() {
    return this.token ? { headers: { Authorization: `Bearer ${this.token}` } } : {};
  }

  ucitaj() {
    this.ucitavanje = true;
    this.http.get<any[]>('https://backend-za-haljine.fly.dev/api/haljine', this.authHeaders()).subscribe({
      next: data => {
        this.haljine = data;
      },
      error: err => {
        console.error('Greška pri učitavanju haljina:', err);
        this.haljine = [];
        this.ucitavanje = false;
        if (err.status === 401) this.logout();
      },
      complete: () => {
        this.ucitavanje = false;
      }
    });
  }

  ucitajNarudzbine() {
    this.http.get<any[]>('https://backend-za-haljine.fly.dev/api/narudzbine', this.authHeaders()).subscribe({
      next: data => {
        this.narudzbine = data;
      },
      error: err => {
        console.error('Greška pri učitavanju narudžbina:', err);
        if (err.status === 401) this.logout();
      }
    });
  }

  dodajHaljinu() {
    this.http.post('https://backend-za-haljine.fly.dev/api/haljine', this.novaHaljina, this.authHeaders()).subscribe(() => {
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
    if (this.korpa.length === 0) {
      alert('Korpa je prazna.');
      return;
    }

    const payload = {
      proizvodi: this.korpa,
      kupac: this.formaKupca
    };

    this.http.post('https://backend-za-haljine.fly.dev/api/naruci-vise', payload, this.authHeaders()).subscribe({
      next: () => {
        alert('✅ Uspešno ste poručili više haljina!');
        this.korpa = [];
        // this.formaKupca = { ime: '', prezime: '', adresa: '', telefon: '', screenshot: '' };
        this.formaKupca = {screenshot: ''};
        this.screenshotUploadInProgress = false;
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
    this.uploadInProgress = true;

    this.http.post<{ url: string }>('https://backend-za-haljine.fly.dev/api/upload', formData, this.authHeaders()).subscribe(res => {
      this.novaHaljina.slika = res.url;
      this.uploadInProgress = false;
    });
  }

  dodajIliAzurirajBoju(id: string, boja: string, kolicina: number) {
    if (!boja || !kolicina) return;

    this.http.post(`https://backend-za-haljine.fly.dev/api/dodajKolicinu/${id}`, {
      boja,
      kolicina,
    }, this.authHeaders()).subscribe(() => {
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

    this.http.delete(`https://backend-za-haljine.fly.dev/api/haljine/${id}`, this.authHeaders()).subscribe(() => {
      this.haljine = this.haljine.filter(h => h._id !== id);
    });
  }

  otvoriFormuZaNarudzbinu(haljina: any, boja: string) {
    this.izabranaHaljina = haljina;
    this.izabranaBoja = boja;
    // this.formaKupca = { ime: '', prezime: '', adresa: '', telefon: '', screenshot: '' };
    this.formaKupca = {screenshot: ''};
  }

  posaljiNarudzbinu() {
    const kolicina = 1;

    this.http.post(`https://backend-za-haljine.fly.dev/api/naruci/${this.izabranaHaljina._id}`, {
      boja: this.izabranaBoja,
      kolicina,
      ...this.formaKupca
    }, this.authHeaders()).subscribe({
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

    this.http.delete(`https://backend-za-haljine.fly.dev/api/narudzbine/${id}`, this.authHeaders()).subscribe(() => {
      this.narudzbine = this.narudzbine.filter(n => n._id !== id);
    });
  }

  uploadScreenshot(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.screenshotUploadInProgress = true;

    const formData = new FormData();
    formData.append('slika', file);

    this.http.post<{ url: string }>('https://backend-za-haljine.fly.dev/api/upload', formData, this.authHeaders())
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

  get filterByName(): any[] {
  const name = this.filterName.trim().toLowerCase();
  if (!name) return this.filteredHaljine; // ako želiš da se kombinuje sa filterBoja

  return this.filteredHaljine.filter(h =>
    h.naziv.toLowerCase().includes(name)
  );
}



  get grupisaneNarudzbine() {
    const grupe: { [key: string]: any } = {};

    const od = this.datumOd ? new Date(this.datumOd) : null;
    const doDatuma = this.datumDo ? new Date(this.datumDo) : null;

    for (const n of this.narudzbine) {
      const vreme = new Date(n.vreme);

      if(od && vreme < od) continue;
      if(doDatuma && vreme > doDatuma) continue;


      const vremeString = new Date(n.vreme).toISOString().slice(0, 16);
      const key = `${n.screenshot}|${vremeString}`;
      // const key = `${n.ime}|${n.prezime}|${n.adresa}|${n.telefon}|${n.screenshot}|${vremeString}`;

      if (!grupe[key]) {
        grupe[key] = {
          kupac: {
            // ime: n.ime,
            // prezime: n.prezime,
            // adresa: n.adresa,
            // telefon: n.telefon,
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
    if (!confirm('Da li si siguran da želiš da obrišeš ovu porudžbinu?')) return;
    const encoded = encodeURIComponent(screenshot);
    this.http.delete(`https://backend-za-haljine.fly.dev/api/narudzbine/grupa/${encoded}`, this.authHeaders())
      .subscribe({
        next: () => {
          this.ucitajNarudzbine();
        },
        error: () => {
          alert('❌ Nije obrisana grupa porudžbina.');
        }
      });
  }

  obrisiBoju(haljinaId: string, boja: string){
  if(!confirm(`Da li želiš da obrišeš boju "${boja}"?`)) return;

  this.http.post(`https://backend-za-haljine.fly.dev/api/obrisi-boju/${haljinaId}`, {
    boja: boja
  }, this.authHeaders()).subscribe({
    next: () => {
      const haljina = this.haljine.find(h => h._id === haljinaId);
      if(haljina){
        haljina.lager = haljina.lager.filter((b:any) => b.boja !== boja);
      }
    },
    error: () => {
      alert('❌ Greška pri brisanju boje.')
    }
  });
}

}
