import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/authContext';

const Header = () => {
  const navigate = useNavigate();
  const { userLoggedIn } = useAuth();

  return null; // Component is empty, returns nothing
};

export default Header;
