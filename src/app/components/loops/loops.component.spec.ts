// loops.component.spec.ts – pure class unit (nincs TestBed)
import { LoopsComponent } from './loops.component';
import { of, throwError } from 'rxjs';

// ---- Mockok
const mockPaged = {
  success: true,
  items: [{
    _id: 'L1',
    filename: 'kick.wav',
    path: 'https://drive.google.com/uc?id=FILE123',
    bpm: 140, key: 'A', scale: 'minor',
    instrument: 'Kick',
    tags: ['trap'],
    uploader: { username: 'user1' },
    likes: 0,
    likedBy: []
  }],
  total: 1, page: 1, pageSize: 8
};

function makeLoopService() {
  return {
    // apiUrl: 'http://localhost:3000',
    apiUrl: 'https://szakdolgozat-backend-tg59.onrender.com',
    getLoops: jest.fn().mockReturnValue(of(mockPaged)),
    likeLoop: jest.fn().mockReturnValue(of({ success: true, likes: 1 })),
    unlikeLoop: jest.fn().mockReturnValue(of({ success: true, likes: 0 })),
    downloadLoop: jest.fn().mockReturnValue(of(new Blob(['x'], { type: 'audio/wav' }))),
    uploadLoop: jest.fn().mockReturnValue(of({ loop: { status: 'approved' } })),
  };
}

function makeAuthService() {
  return {
    isLoggedIn: jest.fn().mockReturnValue(true),
    getUserId: jest.fn().mockReturnValue('U1'),
    isUserVerified: jest.fn().mockReturnValue(of(true)),
  };
}

function makeFavoriteService() {
  return {
    getFavoriteIds: jest.fn().mockReturnValue(of({ success: true, ids: [] as string[] })),
    getUserFavorites: jest.fn().mockReturnValue(of({ favorites: [] })),
    addFavorite: jest.fn().mockReturnValue(of({ success: true })),
    removeFavorite: jest.fn().mockReturnValue(of({ success: true })),
    checkFavoriteStatus: jest.fn().mockReturnValue(of({ isFavorite: false })),
  };
}

function makeReportsService() {
  return { reportLoop: jest.fn().mockReturnValue(of({ success: true })) };
}

function makeHttpClient() {
  return { delete: jest.fn(), patch: jest.fn() };
}

// waveformService mock – hogy a generateWaveform se dőljön el
function makeWaveformService() {
  return {
    getOrCreate: jest.fn().mockResolvedValue({
      peaks: [],
      duration: 0,
    }),
  };
}

describe('LoopsComponent (pure class)', () => {
  let comp: LoopsComponent;
  let loopSvc: any, authSvc: any, favSvc: any, repSvc: any, http: any, waveformSvc: any;

  beforeEach(() => {
    loopSvc = makeLoopService();
    authSvc = makeAuthService();
    favSvc = makeFavoriteService();
    repSvc = makeReportsService();
    http = makeHttpClient();
    waveformSvc = makeWaveformService();

    // FONTOS: a 3. paraméter a waveformService
    comp = new LoopsComponent(loopSvc, authSvc, waveformSvc, favSvc, repSvc, http);
    comp.ngOnInit();
  });

  it('betölt: loops, total, page', () => {
    expect(comp.isLoading).toBe(false);
    expect(comp.loops.length).toBe(1);
    expect(comp.total).toBe(1);
    expect(comp.page).toBe(1);
    expect(comp.volumes['L1']).toBe(0.7);
  });

  it('hiba betöltéskor: isLoading false és nem dob kivételt', () => {
    loopSvc.getLoops.mockReturnValueOnce(throwError(() => new Error('net')));
    comp.loadLoops();
    expect(comp.isLoading).toBe(false);
  });

  it('searchLoops: beállítja a tags filtert és reseteli a page-et', () => {
    comp.searchQuery = 'trap';
    comp.searchLoops();
    expect(comp.filters.tags).toBe('trap');
    expect(comp.page).toBe(1);
  });

  it('applyAdvancedSearch: page=1, modal bezár', () => {
    comp.isAdvancedSearchOpen = true;
    comp.page = 3;
    comp.applyAdvancedSearch();
    expect(comp.page).toBe(1);
    expect(comp.isAdvancedSearchOpen).toBe(false);
  });

  it('pagináció számolása', () => {
    expect(comp.totalPages).toBe(1);
    expect(comp.fromIndex).toBe(1);
    expect(comp.toIndex).toBe(1);
  });

  it('favorite toggle: add -> true, remove -> false', () => {
    const loop = mockPaged.items[0] as any;
    comp.favoriteStatus[loop._id] = false;

    comp.toggleFavorite(loop);
    expect(favSvc.addFavorite).toHaveBeenCalledWith('L1');
    expect(comp.favoriteStatus['L1']).toBe(true);

    comp.toggleFavorite(loop);
    expect(favSvc.removeFavorite).toHaveBeenCalledWith('L1');
    expect(comp.favoriteStatus['L1']).toBe(false);
  });

  it('toggleLike növeli likes-t és likedBy-t', () => {
    const loop: any = { ...mockPaged.items[0], likes: 0, likedBy: [] };
    loopSvc.likeLoop.mockReturnValueOnce(of({ likes: 1 }));
    comp.toggleLike(loop);
    expect(loop.likes).toBe(1);
    expect(loop.likedBy.length).toBe(1);
  });

  it('getSafeAudioUrl: drive id -> api/files/:id', () => {
    const url = comp.getSafeAudioUrl('https://drive.google.com/uc?id=FILE123');
    expect(url).toMatch(/\/api\/files\/FILE123/);
  });

  it('toggleUploadModal: belépett + verified esetén nyit', () => {
    authSvc.isLoggedIn.mockReturnValue(true);
    authSvc.isUserVerified.mockReturnValue(of(true));
    comp.toggleUploadModal();
    expect(comp.isUploadModalOpen).toBe(true);
  });

  it('downloadLoop: siker ágon meghívja a service-t', async () => {
    await comp.downloadLoop(mockPaged.items[0] as any);
    expect(loopSvc.downloadLoop).toHaveBeenCalledWith('L1');
  });

  it('downloadLoop: NO_CREDITS hiba esetén alertet jelez', async () => {
    const err: any = {
      status: 402,
      // blob helyett olyan objektum, amin van text()
      error: {
        text: () => Promise.resolve(JSON.stringify({ code: 'NO_CREDITS' }))
      }
    };
    loopSvc.downloadLoop.mockReturnValueOnce(throwError(() => err));

    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    await comp.downloadLoop(mockPaged.items[0] as any);

    // várunk, hogy a Promise kifusson
    await new Promise(res => setTimeout(res, 0));

    expect(alertSpy).toHaveBeenCalled();
    alertSpy.mockRestore();
  });

});


// Az Angular-féle TestBed-es boilerplate meghagyható kommentben,
// de a pure class unit teszt miatt nincs rá szükség a futtatáshoz.

// import { ComponentFixture, TestBed } from '@angular/core/testing';
//
// import { LoopsComponent } from './loops.component';
//
// describe('LoopsComponent', () => {
//   let component: LoopsComponent;
//   let fixture: ComponentFixture<LoopsComponent>;
//
//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [LoopsComponent]
//     })
//     .compileComponents();
//
//     fixture = TestBed.createComponent(LoopsComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });
//
//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });
// });
