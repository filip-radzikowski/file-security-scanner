import { Canvas } from '../canvas/Canvas';
import { ListView } from '../components/ListView';
import { useOmaltStore } from '../store/useOmaltStore';

export default function Home() {
  const listView = useOmaltStore((s) => s.listView);
  return listView ? <ListView /> : <Canvas />;
}
