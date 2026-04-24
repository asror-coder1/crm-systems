import UsersManager from "./UsersManager";
export default function Teachers() {
  return <UsersManager filterRole="teacher" title="O'qituvchilar" description="Barcha teacherlar" />;
}
