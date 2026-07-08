import { supabase } from './supabase';

export async function uploadAnuncioFoto(file: File, anuncioId: string, index: number) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `anuncios/${anuncioId}/${Date.now()}-${index}.${ext}`;

  const { error } = await supabase.storage.from('agromarket').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from('agromarket').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadVitrineImagem(file: File, usuarioId: string, tipo: 'logo' | 'banner') {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `vitrines/${usuarioId}/${tipo}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('agromarket').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from('agromarket').getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadPerfilArquivo(file: File, usuarioId: string, tipo: 'selfie' | 'documento') {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `usuarios/${usuarioId}/${tipo}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('agromarket').upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from('agromarket').getPublicUrl(path);
  return data.publicUrl;
}
