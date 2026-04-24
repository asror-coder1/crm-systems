import UsersManager from "./UsersManager";
export default function Admins() {
  return <UsersManager filterRole="admin" title="Adminlar" description="Tashkilot adminlari" />;
}
